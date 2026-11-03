console.log('Ping Pong');

//obtenemos el canvas, lo mantenemos del breakout ya que quiero usar la misma lógica del juego
const lienzo = document.getElementById('lienzo');
//obtenemos el contexto del lienzo, ctx es con lo que dibujamos todo
const ctx = lienzo.getContext('2d');

//obtenemos el ancho y el alto del lienzo
const { width, height } = lienzo;

let juegoIniciado = false;
let juegoFinalizado = false;

//colores del club Nacional de football
//cambie los colores para que sean los del bolso
const colores = [
    '#ffffff',
    '#ff0000',
    '#0000ff',
    '#00005f',
    '#CF0028',
    '#000000'
];

//limpia el canvas
function cls ()
{
    ctx.clearRect(0, 0, width, height); //borramos todo
    rectFill(0, 0, width, height, 3); //pintamos el fondo de color negro
}

//numero aleatorio entre 0 y max, sirve para la pelota al iniciar
function rnd (max)
{
    return Math.random() * max;
}

//dibuja un rectangulo para los jugadores
function rectFill (x1, y1, x2, y2, color)
{
    ctx.fillStyle = colores[ color ];
    ctx.fillRect(
        x1, y1,
        Math.max(x1, x2) - Math.min(x1, x2), //calcula el ancho del rectangulo
        Math.max(y1, y2) - Math.min(y1, y2) //calcula el alto del rectangulo
    );
}

//dibujamos un circulo para la pelota
function circFill (x, y, r, color)
{
    ctx.fillStyle = colores[ color ]; //color de la pelota

    ctx.beginPath(); //iniciamos el dibujo de un circulo
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

//txt=texto, x/y=posición, c=índice de color, font=tipografía,
// align=alineación horizontal ('left','center','right'), baseline=alineación vertical
function print (txt, x, y, c, font = 'bold 30px sans', align = 'left', 
baseline = 'top')
{
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillStyle = colores[ c ];

    ctx.fillText(txt, x, y);
}

//detecta colisiones entre dos entidades usando AABB (Axis-Aligned Bounding Box)
function colision (a, b)
{
    return !(
        a.x + a.hitbox.x1 > b.x + b.hitbox.x2 //si la pelota esta a la derecha de la paleta
        || a.x + a.hitbox.x2 < b.x + b.hitbox.x1 //si la pelota esta a la izquierda de la paleta
        || a.y + a.hitbox.y1 > b.y + b.hitbox.y2 //si la pelota esta abajo de la paleta
        || a.y + a.hitbox.y2 < b.y + b.hitbox.y1 //si la pelota esta arriba de la paleta
    );
}

//detecta cuando se presiona una tecla
//hace uso del patron singleton
function btn (boton)
{
    const i = Control.getInstance();
    return i[ boton ];  // accede a la propiedad por nombre, ej: i['up'] = i.up
}

// Flechas arriba/abajo del Jugador 1 
// W/S del Jugador 2
class Control
{
    // garantiza que solo exista UNA instancia de Control
    static instance = null;

    // cada uno es true cuando la tecla está presionada, false cuando se suelta
    up = false;
    down = false;
    x = false;
    o = false;
    g = false; //para iniciar el juego
    w = false; //para el jugador 2
    s = false; //para el jugador 2

    //constructor del singleton, solo se puede crear una instancia
    constructor ()
    {
        window.addEventListener('keyup',    this.manageControl.bind(this)); //detecta cuando se suelta una tecla
        window.addEventListener('keydown',  this.manageControl.bind(this)); //detecta cuando se presiona una tecla
    }

    static getInstance ()
    {
        if (Control.instance === null) 
        {
            Control.instance = new Control();
        }

        return Control.instance;
    }

    //maneja el control de las teclas
    manageControl (evt)
    {
        const presionando = evt.type == 'keydown';

        switch (evt.code)
        {
            case 'ArrowUp': //jugador 1
                this.up = presionando;
                break;
                
            case 'ArrowDown': //jugador 1
                this.down = presionando;
                break;
                
            case 'KeyW': //jugador 2
                this.w = presionando;
                break;
                
            case 'KeyS': //jugador 2 
                this.s = presionando;
                break;
                
            case 'KeyZ':
                this.o = presionando;
                break;
                
            case 'KeyX':
                this.x = presionando;
                break;

            case 'KeyG': //para iniciar el juego
                this.g = presionando;
                break;

        }
    }
}

class Camara 
{
    #x = 0;// desplazamiento horizontal actual
    #y = 0;// desplazamiento vertical actual
    #shake = 0;// frames restantes de vibración

    static #instancia = null;

    constructor ()
    {
        this.overlayColor = colores[4]; //color que aparece al vibrar
    }

    static getInstance ()
    {
        if (Camara.#instancia === null)
        {
            Camara.#instancia = new Camara();
        }

        return Camara.#instancia;
    }

    // Las propiedades con # son privadas
    get x ()
    {
        return this.#x;
    }

    set x (valor)
    {
        this.#x = valor;
        return this.#x;
    }

    get y ()
    {
        return this.#y;
    }

    set y (valor)
    {
        this.#y = valor;
        return this.#y;
    }

    //temblor de la camara, activa la vibración por N frames
    shake (frames)
    {
        this.#shake = frames;
        overlays.push(this.overlayColor); //agrega el flash rojo encima
    }

    //actualiza la camara, se llama cada frame desde draw()
    update ()
    {
        if (this.#shake > 0)
        {
            this.#shake--;//resta un frame de vibración

            this.x = Math.random() * 20 - 10;//Mueve la cámara a una posición aleatoria entre -10 y +10 en cada eje
            this.y = Math.random() * 20 - 10;
        }
        else
        {
            this.x = 0;//Sin shake, cámara quieta en 0,0
            this.y = 0;

            const ind = overlays.indexOf(this.overlayColor);//Quita el overlay rojo del array
            overlays.splice(ind, 1);
        }
    }
}

//clase base para todas las entidades
class Entidad
{
    // Todas las entidades creadas se guardan acá automáticamente
    static entidades = []; //static, o sea que pertenece a la CLASE, no a cada objeto

    #x = 0;//posicion x
    #y = 0;//posicion y
    #width = 0;//ancho
    #height = 0;//alto

    //constructor de la entidad
    constructor ()
    {
        this.color = 0; // índice de color de la paleta

        this.dx = 0;  // velocidad horizontal (positivo = derecha, negativo = izquierda)
        this.dy = 0;  // velocidad vertical (positivo = abajo, negativo = arriba)

        // x1,y1 = esquina superior izquierda del hitbox
        // x2,y2 = esquina inferior derecha del hitbox
        this.hitbox = {
            x1: 0, y1: 0, x2: 0, y2: 0
        };

        //agrega la entidad a la lista de entidades automáticamente al crearse
        Entidad.entidades.push(this);
    }

    // Getters y setters — controlan cómo se lee/escribe x, y, width, height
    get x ()
    {
        return this.#x;
    }

    set x (valor)
    {
        this.#x = valor;
        return this.#x;
    }

    get y ()
    {
        return this.#y;
    }

    set y (valor)
    {
        this.#y = valor;
        return this.#y;
    }

    get width ()
    {
        return this.#width;
    }

    // Cuando asignás width, automaticamente actualiza hitbox.x2
    set width (valor)
    {
        this.#width = valor;
        this.hitbox.x2 = valor;
        return this.#width;
    }

    get height ()
    {
        return this.#height;
    }

    // al asignar height, actualiza hitbox.y2
    set height (valor)
    {
        this.#height = valor;
        this.hitbox.y2 = valor;

        return this.#height;
    }

    // las clases hijas lo sobreescriben
    control () {}

    update ()
    {
        this.control();

        // Aplica velocidad para mover la entidad
        this.x += this.dx;
        this.y += this.dy;

        //si la entidad no tiene vida, se elimina sola
        if (this.vida <= 0)
        {
            // Quitar entidad de la lista de entidades
            const ind = Entidad.entidades.indexOf(this);
            Entidad.entidades.splice(ind, 1);

            // Si la entidad tiene un método onDeath, lo ejecuta
            if (this.onDeath !== undefined)
            {
                this.onDeath();
            }
        }
    }

    // un rectángulo del tamaño de la entidad
    draw ()
    {
        rectFill(
            this.x, this.y,
            this.x + this.width,
            this.y + this.height,
            this.color
        );
    }
}

class Jugador extends Entidad
{
    constructor (teclaArriba, teclaAbajo, posX)
    {
        super();

        this.width = 20;   
        this.height = 120;  
        this.color = 0;

        // Guardar teclas para usar despues
        this.tecArriba = teclaArriba;
        this.tecAbajo = teclaAbajo;

        //Guardar posición inicial
        this.posInicialX = posX;
        
        // Posicionar al jugador
        this.x = posX;
        this.y = area.y1 + (area.y2 - area.y1) / 2 - this.height / 2;
        this.vel = 5;
        this.puntos = 0; 
    }

    // lee el teclado y mueve la paleta
    control ()
    {
        this.dy = 0;  // resetea velocidad

        if (btn(this.tecArriba)) this.dy = -this.vel;
        if (btn(this.tecAbajo)) this.dy = this.vel;
        
        // evita que la paleta salga del área
        if (this.y < area.y1)
        {
            this.y = area.y1;
            this.dy = 0
        }

        if (this.y > area.y2 - this.height)
        {
            this.y = area.y2 - this.height;
            this.dy = 0;
        }
    }

    //reinicia la posicion del jugador
    reset ()
    {
        this.x = this.posInicialX;
        this.y = area.y1 + (area.y2 - area.y1) / 2 - this.height / 2;
    }

}

//para los resultados
class Cartel extends Entidad
{
    constructor (txt /*String*/, fg /*Int*/, bg /*Int*/)
    {
        super();

        this.x = 0;
        this.y = height / 3;// un tercio de la pantalla
        this.height = this.y;      
        this.width = width;        

        this.txt = txt;
        this.color = fg;// color del texto
        this.bg = bg; // color del fondo del cartel

        // overlays.push('#000a');
    }

    // Sobreescribe el draw() de Entidad con su propio dibujo
    draw ()
    {
        ctx.fillStyle = '#000a';
        ctx.fillRect(
            area.x1, area.y1,
            area.x2 - area.x1,
            area.y2 - area.y1
        );

        rectFill(
            this.x, this.y, 
            this.x + this.width, this.y + this.height, 
            this.bg
        );

        print(
            this.txt, this.x + this.width / 2, this.y + this.height / 2, 
            this.color, 'bold 40px sans', 'center', 'center'
        );
    }
}

//clase de la pelota
class Pelota extends Entidad
{
    constructor ()
    {
        super();

        this.width = 30;
        this.height = this.width;
        this.color = 1;


        this.hitbox = {
            x1: 3, y1: 3, x2: 27, y2: 27
        };
        this.vel = 4;
    }

    control ()
    {
        // Si el juego terminó y se presiona G, reiniciar todo
        if(juegoFinalizado && btn('g')){
            juegoFinalizado = false;
            juegoIniciado = false;
            j.puntos = 0;
            j2.puntos = 0;
            // Eliminar carteles
            Entidad.entidades = Entidad.entidades.filter(e => !(e instanceof Cartel));
            reset();
            return;
        }

        // Si la pelota está quieta y se presiona G (o ya se inició la partida), lanzar
        if(this.dx === 0 && this.dy === 0 && !juegoFinalizado && (btn('g') || juegoIniciado)){
            juegoIniciado = true;
            // Dirección horizontal aleatoria (izquierda o derecha)
            const dirX = Math.random() > 0.5 ? 1 : -1;
            // Ángulo vertical aleatorio
            const dirY = (Math.random() * 1.4 - 0.7);
            this.dx = dirX * this.vel;
            this.dy = dirY * this.vel;
        }

        // Si algún jugador llego a 10 puntos, detener la pelota
        if (j.puntos >= 10 || j2.puntos >= 10)
        {
            this.dx = 0;
            this.dy = 0;

            // Solo mostrar el cartel UNA vez
            if(!juegoFinalizado){
                juegoFinalizado = true;
                juegoIniciado = false;
                if (j.puntos >= 10) new Cartel("Gano el jugador 1", 4, 2);
                else new Cartel("Gano el jugador 2", 2, 4);
            }

            return;
        }

        if (this.x <= area.x1)
        {
            j2.puntos += 1;   
            sonido(1);  
            Camara.getInstance().shake(30); 

            reset(); 
        }

        if(this.x >= area.x2 - this.width)
        {
            j.puntos += 1;   
            sonido(1);  
            Camara.getInstance().shake(30); 

            reset(); 
        }

        if (this.y <= area.y1)
        {
            this.dy *= -1;
        }

        for (const e of Entidad.entidades)
        {
            // ¿La entidad a verificar es la pelota?
            if (e === this)
            {
                // Nos saltamos el resto
                continue;
            }

            if (colision(this, e)) this.onColision(e);
        }

        if (this.y >= area.y2 - this.height)
        {
            this.dy *= -1;                        
        }
    }

    // Reinicia la pelota al centro
    reset ()
    {
        // Centrado al medio del ÁREA de juego (no de la pantalla)
        this.x = area.x1 + (area.x2 - area.x1) / 2 - this.width / 2;
        this.y = area.y1 + (area.y2 - area.y1) / 2 - this.height / 2;

        // Detener la pelota
        this.dx = 0;
        this.dy = 0;   
    }

    onColision (entidad)
    {
        let dy_actual = this.dy;
        this.y -= this.dy; 

        if (!colision(this, entidad))
        {
            this.dy *= -1;
        }

        this.y += dy_actual;

        let dx_actual = this.dx;
        this.x -= this.dx;

        if (!colision(this, entidad))
        {
            this.dx *= -1;
        }

        this.x += dx_actual; 

        sonido(0); // sonido de rebote

        if (entidad.onColision !== undefined)
        {
            entidad.onColision(this);
        }
    }

    draw ()
    {
        circFill(
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.width / 2,
            this.color
        );

        /*
        ctx.strokeStyle = colores[ 11 ];
        ctx.strokeRect(
            this.x + this.hitbox.x1,
            this.y + this.hitbox.y1,
            this.hitbox.x2 - this.hitbox.x1,
            this.hitbox.y2 - this.hitbox.y1
        )
        */
    }
}

//colores que se dibujan encima de todo
const overlays = [];

// Genera sonidos sin archivos de audio, todo con matemáticas
function sonido (ind = 0)
{
    const t = (i, n) => (n - i) / n;

    const sonidos = [
        // 0: Choque
        i => Math.sin(i / 20) * Math.exp(-i / 300), 
        
        // 1: Gol
        i => (Math.random() * 2 - 1) * Math.exp(-i/1e4),
    ];

    const f = sonidos[ ind ];
    
    const A = new AudioContext();
    const m = A.createBuffer(1, 96e3, 48e3);
    const b = m.getChannelData(0);

    for (let i=96e3; i--;)
    {
        b[i] = f(i);
    }

    // Crea un nodo fuente, le asigna el buffer, lo conecta a la salida y reproduce
    const s = A.createBufferSource();
    
    s.buffer = m;
    s.connect(A.destination);
    s.start();
}

// Dibuja la línea central punteada (se llama ANTES de las entidades para que la pelota quede encima)
function lineaCentral ()
{
    const centroX = width / 2;
    const cantidadSegmentos = 20;
    const altoTotal = area.y2 - area.y1;
    const altoSegmento = altoTotal / (cantidadSegmentos * 2);
    for (let i = 0; i < cantidadSegmentos; i++)
    {
        const yPos = area.y1 + i * altoSegmento * 2;
        rectFill(centroX - 2, yPos, centroX + 2, yPos + altoSegmento, 0); 
    }
}

function hud ()
{

    for (const o of overlays)
    {
        ctx.fillStyle = o;
        ctx.fillRect(
            area.x1, area.y1,
            area.x2 - area.x1, area.y2 - area.y1
        );
    }

    rectFill(0, 0, width, area.y1 + 5, 5);

    // Puntos
    print(
        `J1: `,
        10, 10,// Posición
        0,// Color
        'bold 24px sans',// Font
    );
    print(
        ` :J2`,
        width - 50, 10,
        0,
        'bold 24px sans', 
    );

    const anchoJ1 = ctx.measureText('J1: ').width;
    const anchoJ2 = ctx.measureText('J2: ').width;

    print(
        j.puntos,
        10 + anchoJ1, 10,
        1,
        'bold 24px sans',
    )

    print(
        j2.puntos,
        width - 25 - anchoJ2, 10,
        1,
        'bold 24px sans', 
    )

    print(
        'PING PONG',
        width / 2, 8,
        0,
        'bold 30px serif',
        'center'
    );

}

function reset ()
{
    j.reset();
    j2.reset();
    p.reset();
}

//recorre todas las entidades y las actualiza
function update ()
{
    for (const entidad of Entidad.entidades)
    {
        entidad.update();
    }
}

function draw ()
{
    const cam = Camara.getInstance();
    cam.update();

    ctx.translate(cam.x, cam.y);  //aplica desplazamiento de cámara

    // Primero la línea central (queda debajo de la pelota y paletas)
    lineaCentral();

    // Después las entidades (pelota, paletas)
    for (const entidad of Entidad.entidades)
    {
        // Los carteles no se dibujan acá, se dibujan al final encima de todo
        if (entidad instanceof Cartel) continue;
        entidad.draw();
    }

    // Después el HUD (barra superior, puntos)
    hud();

    // Por último los carteles, así quedan ENCIMA de todo
    for (const entidad of Entidad.entidades)
    {
        if (entidad instanceof Cartel) entidad.draw();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);  //resetear transformaciones

    /*
    ctx.strokeStyle = colores[ 11 ];
    ctx.strokeRect(
        area.x1,
        area.y1,
        area.x2 - area.x1,
        area.y2 - area.y1,
    )
    */
}

function gameloop ()
{
    cls();       // limpiar pantalla

    update();    // actualizar lógica de todas las entidades
    draw();      // dibujar todo

    requestAnimationFrame(gameloop);  // repetir
}

//define los límites donde se mueven las entidades
const area = {
    x1: 0, y1: 30,
    x2: width, y2: height,
};

// J1: izquierda, teclas W/S
// J2: derecha, teclas flechas
const margenPaleta = 30;
const j = new Jugador('w', 's', area.x1 + margenPaleta);
const j2 = new Jugador('up', 'down', area.x2 - margenPaleta - 20);
const p = new Pelota();

// Inicia el juego
reset();
gameloop();
