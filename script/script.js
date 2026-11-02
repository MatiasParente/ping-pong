console.log('Ping Pong');

//obtenemos el canvas, lo mantenemos del breakout ya que quiero usar la misma lógica del juego
const lienzo = document.getElementById('lienzo');
//obtenemos el contexto del lienzo, ctx es con lo que dibujamos todo
const ctx = lienzo.getContext('2d');

//obtenemos el ancho y el alto del lienzo
const { width, height } = lienzo;

//colores del club Nacional de football
//cambie los colores para que sean los del bolso
const colores = [
    '#ffffff',
    '#ff0000',
    '#0000ff',
    '#00005f',
    '#ff720e2b',
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
// Ahora left/right no se usan (las paletas se mueven arriba/abajo)
// Flechas arriba/abajo → Jugador 1 (paleta de abajo)
// W/S → Jugador 2 (paleta de arriba)
class Control
{
    // garantiza que solo exista UNA instancia de Control
    static instance = null;

    // cada uno es true cuando la tecla está presionada, false cuando se suelta
    up = false;
    down = false;
    x = false;
    o = false;
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

        }
    }
}

// PING PONG: ⚠️ OPCIONAL — El shake (vibración) queda bien cuando alguien anota punto
// No es obligatorio pero le da jugo visual. Si no lo querés, podés sacarlo.
//camara para el juego — realmente no es un "zoom", es un efecto de VIBRACIÓN
// Cuando llamás shake(30), la pantalla tiembla por 30 frames (~0.5 seg)
// Funciona desplazando todo lo dibujado con ctx.translate() en draw()
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
        this.vida = 1; // vida de la entidad (0 = se elimina sola)

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

    // las clases hijas lo sobreescriben con su propia lógica
    control () {}

    // Se ejecuta cada frame para cada entidad:
    // 1. Ejecuta control() (la lógica específica de cada entidad)
    // 2. Aplica la velocidad (mueve la entidad)
    // 3. Si vida <= 0, se auto-elimina y llama onDeath()
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

    // Dibujo por defecto: un rectángulo del tamaño de la entidad
    // Las clases hijas pueden sobreescribirlo (la Pelota lo hace para dibujar un círculo)
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

// PING PONG: ❌ NO SIRVE — Los ladrillos son del Breakout, en Ping Pong no hay
// ELIMINAR toda esta clase cuando hagas el Ping Pong
//bloque de ladrillos
// Hereda de Entidad. Cada ladrillo tiene vidas (más vidas = más golpes para romperlo)
// El color cambia según las vidas restantes (7 + vidas = índice de color)
// Cuando la pelota lo golpea, pierde una vida. Cuando llega a 0, se destruye y suma puntos.
class Ladrillo extends Entidad
{
    //constructor del ladrillo, le asignamos posicion, tamaño y vidas
    constructor (x, y, w = 100, h = 30, vidas = 1)
    {
        super();  // llama al constructor de Entidad (se auto-registra en la lista)

        this.x = x;
        this.y = y;

        this.width = w;
        this.height = h;

        this.color = 7 + vidas;  // color dinámico según vidas

        this.vida = vidas;
        this.puntos = vidas * 10;  // más vidas = más puntos al romperlo
    }

    // Se ejecuta cuando ALGO colisiona con el ladrillo
    // ent === p verifica si lo que chocó es la pelota (variable global p)
    onColision (ent)
    {
        if (ent === p)
        {
            this.vida--;              // pierde una vida
            this.color = 7 + this.vida; // actualiza color
        }
    }

    // Se ejecuta cuando el ladrillo se destruye (vida llega a 0)
    onDeath ()
    {
        j.puntos += this.puntos;  // suma puntos al jugador
    }
}


// PING PONG: ⚠️ SIRVE CON CAMBIOS GRANDES — Esta es la "paleta" del Breakout
// Para Ping Pong necesitás:
//   1. Renombrar a "Paleta"
//   2. Cambiar movimiento HORIZONTAL → VERTICAL (dy en vez de dx, up/down en vez de left/right)
//   3. Cambiar tamaño: de ancha y baja (150x20) a angosta y alta (ej: 20x100)
//   4. Crear DOS instancias: paleta arriba (J2) y paleta abajo (J1)
//   5. Que cada paleta reciba sus propias teclas (J1: flechas, J2: W/S)
//   6. Quitar el sistema de vidas (en Ping Pong no se muere, se anota punto)
//   7. Quitar puedeCtrl (no hace falta bloquear controles)
class Jugador extends Entidad
{
    constructor ()
    {
        super();

        this.width = 150;   // PING PONG: ⚠️ Cambiar — paleta vertical sería ej: width=100, height=20
        this.height = 20;   // PING PONG: ⚠️ Cambiar — intercambiar con width
        this.color = 9;     // naranja
        // Se posiciona centrado horizontalmente, abajo del todo
        this.x = (area.x2 - area.x1) / 2 - this.width / 2;
        this.y = area.y2 - this.height;
        // PING PONG: ⚠️ Cambiar posición — J1 abajo, J2 arriba

        this.vel = 5;          // velocidad de movimiento
        this.puedeCtrl = true; // PING PONG: ❌ No se necesita

        this.puntos = 0;       // PING PONG: ✅ Sirve
        this.vida = 3;         // PING PONG: ❌ No se necesita (no hay vidas en Pong)
    }

    // Se ejecuta cada frame — lee el teclado y mueve la paleta
    control ()
    {
        this.dx = 0;  // resetea velocidad horizontal cada frame

        if (!this.puedeCtrl)  // PING PONG: ❌ Quitar este bloqueo
        {
            return;
        }
        // Controles del jugador, mueve el rectangulo
        // PING PONG: ⚠️ Cambiar a movimiento HORIZONTAL (izq/der)
        // En vez de this.dx, usar this.dx para mover la paleta en X
        // J1: btn('left') / btn('right') → this.dx = ±vel
        // J2: btn('a') / btn('d') ó btn('w') / btn('s') o lo que prefieras
        if (btn('right')) this.dx = this.vel;
        if (btn('left')) this.dx -= this.vel;

        // Restricciones horizontales — evita que la paleta salga del área
        // PING PONG: ⚠️ Cambiar a restricciones en X (no salirse del área)
        if (this.x < area.x1)
        {
            this.x = area.x1;
            this.dx = 0
        }

        if (this.x > area.x2 - this.width)
        {
            this.x = area.x2 - this.width;
            this.dx = 0;
        }
    }

    //reinicia la posicion del jugador y desactiva los controles
    // PING PONG: ⚠️ Simplificar — solo recentrar la paleta, sin el setTimeout
    reset ()
    {
        this.x = (area.x2 - area.x1) / 2 - this.width / 2;
        this.y = area.y2 - this.height;
        this.puedeCtrl = false;

        // Después de 1.8 seg reactiva controles — PING PONG: ❌ No se necesita
        setTimeout(() => this.puedeCtrl = true, 1800);
    }

    // Se ejecuta cuando algo colisiona con el jugador
    // Cambia de color con cada golpe (efecto visual del Breakout)
    // PING PONG: ❌ No se necesita este efecto
    onColision (entidad)
    {
        this.color++;

        if (this.color == 7) this.color++;   // salta el blanco (no se ve en fondo blanco)
        if (this.color == 16) this.color = 0; // vuelve al principio de la paleta
    }

    // Se ejecuta cuando vida llega a 0
    // PING PONG: ❌ No se necesita — en Pong no se muere
    onDeath ()
    {
        new Cartel('¡Moriste!', 7, 8);
    }
}

// PING PONG: ⚠️ SIRVE — Útil para mostrar "¡Punto J1!", "¡Gana J2!", etc.
// Solo cambiás los textos
//cartel que muestra mensajes — hereda de Entidad
// Ocupa todo el ancho de la pantalla y se posiciona en el tercio superior
// fg = color del texto (foreground), bg = color del fondo (background)
class Cartel extends Entidad
{
    constructor (txt /*String*/, fg /*Int*/, bg /*Int*/)
    {
        super();

        this.x = 0;
        this.y = height / 3;       // posición vertical: un tercio de la pantalla
        this.height = this.y;       // altura del cartel = otro tercio
        this.width = width;         // ancho completo

        this.txt = txt;
        this.color = fg;            // color del texto
        this.bg = bg;               // color del fondo del cartel

        // overlays.push('#000a');
    }

    // Sobreescribe el draw() de Entidad con su propio dibujo
    draw ()
    {
        // Primero dibuja un overlay semi-transparente negro sobre toda el área
        // '#000a' = negro con alfa (semi-transparente) → oscurece el juego de fondo
        ctx.fillStyle = '#000a';
        ctx.fillRect(
            area.x1, area.y1,
            area.x2 - area.x1,
            area.y2 - area.y1
        );

        // Dibuja el rectángulo de fondo del cartel
        rectFill(
            this.x, this.y, 
            this.x + this.width, this.y + this.height, 
            this.bg
        );

        // Dibuja el texto centrado dentro del cartel
        print(
            this.txt, this.x + this.width / 2, this.y + this.height / 2, 
            this.color, 'bold 40px sans', 'center', 'center'
        );
    }
}

// PING PONG: ⚠️ SIRVE CON CAMBIOS — La pelota es esencial, pero hay que cambiar
// los rebotes: en Breakout rebota en paredes izq/der/arriba y "cae" abajo.
// En Ping Pong vertical: rebota en paredes izq/der, y "sale" arriba/abajo = gol.
//clase de la pelota
class Pelota extends Entidad
{
    constructor ()
    {
        super();

        this.width = 30;
        this.height = this.width;  // es cuadrada (30x30) aunque se dibuja como círculo
        this.color = 12;           // azul celeste

        // Hitbox ligeramente más chica que el tamaño visual
        // Esto da un poco de "tolerancia" — hace que la colisión sea más justa
        this.hitbox = {
            x1: 3, y1: 3, x2: 27, y2: 27
        };
        this.vel = 4;  // velocidad base
    }

    // Lógica de la pelota — se ejecuta cada frame
    control ()
    {
        // Si el jugador no tiene vida, detener la pelota
        // PING PONG: ⚠️ Cambiar — chequear si el juego terminó de otra forma
        if (j.vida <= 0)
        {
            this.dx = 0;
            this.dy = 0;
            return;
        }

        // Rebote en paredes laterales (izquierda y derecha)
        // Cuando toca el borde, invierte la dirección horizontal (dx *= -1)
        // PING PONG: ✅ SIRVE — En Ping Pong vertical la pelota también rebota en los laterales
        if (this.x <= area.x1 || this.x >= area.x2 - this.width)
        {
            this.dx *= -1;
        }

        // Choque arriba — en Breakout la pelota rebota en el techo
        // PING PONG: ❌ CAMBIAR — En Ping Pong si sale por ARRIBA = gol (punto para J1)
        // En vez de rebotar, sumar punto y reiniciar
        if (this.y <= area.y1)
        {
            this.dy *= -1;
        }

        // Recorre TODAS las entidades y verifica colisión con cada una
        // e === this → se saltea a sí misma (la pelota no colisiona consigo misma)
        // PING PONG: ✅ SIRVE — Pero solo debería colisionar con las paletas
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

        // Choque abajo — en Breakout si la pelota cae abajo, el jugador pierde vida
        // PING PONG: ❌ CAMBIAR — Si sale por ABAJO = gol (punto para J2)
        // En vez de quitar vida, sumar punto al J2 y reiniciar posiciones
        if (this.y >= area.y2 - this.height)
        {
            j.vida--;

            sonido(1);                        // sonido de muerte/gol
            Camara.getInstance().shake(30);    // vibración de pantalla

            reset();                           // reiniciar posiciones
        }
    }

    // Reinicia la pelota al centro
    // PING PONG: ⚠️ Cambiar — centrar en la cancha, no sobre la paleta
    reset ()
    {
        // Centra horizontalmente
        this.x = area.x1 + (area.x2 - area.x1) / 2 - this.width / 2;
        // En Breakout: la posiciona justo arriba del jugador
        // PING PONG: Cambiar a centrar verticalmente en la cancha
        this.y = area.y2 - this.height - j.height - 10;

        // Detener la pelota
        this.dx = 0;
        this.dy = 0;

        // Después de 2 segundos, lanzar la pelota en diagonal
        // PING PONG: ⚠️ Cambiar dirección — lanzar hacia arriba O abajo aleatoriamente
        setTimeout(() => {
            this.dx = this.vel;
            this.dy = -this.vel;
        }, 2000);
    }

    // Se ejecuta cuando la pelota choca con algo
    // ESTA LÓGICA ES MUY INTELIGENTE — determina de qué lado vino el golpe:
    // "Deshace" el movimiento en un eje, si ya no hay colisión → el golpe fue por ese eje
    // PING PONG: ✅ SIRVE tal cual — funciona perfecto para los rebotes con paletas
    onColision (entidad)
    {
        // PASO 1: ¿El golpe fue VERTICAL (arriba/abajo)?
        let dy_actual = this.dy;
        this.y -= this.dy;  // "retrocede" en Y (deshace el movimiento vertical)

        // Si al retroceder en Y ya no hay colisión → el choque ERA vertical
        if (!colision(this, entidad))
        {
            this.dy *= -1;  // invertir dirección vertical
        }

        this.y += dy_actual;  // restaura la posición original

        // PASO 2: ¿El golpe fue HORIZONTAL (izquierda/derecha)?
        let dx_actual = this.dx;
        this.x -= this.dx;  // "retrocede" en X

        if (!colision(this, entidad))
        {
            this.dx *= -1;  // invertir dirección horizontal
        }

        this.x += dx_actual;  // restaura la posición original

        sonido(0);  // sonido de rebote

        // Si la entidad golpeada tiene su propio onColision, lo ejecuta
        // (en Breakout el ladrillo pierde vida, el jugador cambia color)
        if (entidad.onColision !== undefined)
        {
            entidad.onColision(this);
        }
    }

    // Dibuja la pelota como CÍRCULO (sobreescribe el rectángulo de Entidad)
    // PING PONG: ✅ SIRVE tal cual
    draw ()
    {
        circFill(
            this.x + this.width / 2,   // centro X del círculo
            this.y + this.height / 2,  // centro Y del círculo
            this.width / 2,            // radio = mitad del ancho
            this.color
        );

        // Código de debug comentado — dibuja el borde del hitbox para verlo
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

// Array de colores overlay que se dibujan encima de todo (lo usa el shake de la cámara)
// PING PONG: ⚠️ Opcional — solo si usás el shake
const overlays = [];

// PING PONG: ✅ SIRVE — Genera sonidos SIN archivos de audio, todo con matemáticas
// Cada sonido es una función que genera la forma de onda sample por sample
function sonido (ind = 0)
{
    const t = (i, n) => (n - i) / n; // lerp — no se usa realmente

    const sonidos = [
        // 0: Choque — onda sinusoidal que decae rápido → suena como "pip"
        // Math.sin genera la onda, Math.exp(-i/300) la hace decaer (fade out)
        i => Math.sin(i / 20) * Math.exp(-i / 300), 
        
        // 1: Muerte/Gol — ruido blanco que decae lento → suena como explosión
        // Math.random()*2-1 genera valores aleatorios entre -1 y 1 (ruido)
        i => (Math.random() * 2 - 1) * Math.exp(-i/1e4),
    ];

    const f = sonidos[ ind ];
    
    // Crea un AudioContext (el "reproductor" de audio del navegador)
    // Genera un buffer de 96000 muestras a 48kHz = 2 segundos de audio
    const A = new AudioContext();
    const m = A.createBuffer(1, 96e3, 48e3);  // 1 canal, 96000 muestras, 48kHz
    const b = m.getChannelData(0);             // obtiene el array de samples

    // Llena cada muestra con el resultado de la función de sonido
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

// PING PONG: ⚠️ SIRVE CON CAMBIOS — El HUD hay que adaptarlo para 2 jugadores
// En vez de "Puntos" de 1 jugador, mostrar puntos de J1 y J2
// Quitar las vidas (💚), cambiar título a "PING PONG"
// hud = Heads-Up Display — la interfaz que se dibuja encima del juego
function hud ()
{
    // Overlay — dibuja los colores semi-transparentes del array overlays
    // Lo usa el shake para poner un flash rojo
    for (const o of overlays)
    {
        ctx.fillStyle = o;
        ctx.fillRect(
            area.x1, area.y1,
            area.x2 - area.x1, area.y2 - area.y1
        );
    }

    // Puntos — muestra el texto "Puntos: " y después el número
    // PING PONG: ⚠️ Cambiar — mostrar puntos de J1 a la izquierda y J2 a la derecha
    // measureText() calcula el ancho en píxeles del texto para posicionar el número al lado
    print(
        `Puntos: `,
        10, 10,             // Posición
        3,                 // Color
        'bold 24px sans',   // Font
    );

    const ancho = ctx.measureText('Puntos: ').width;

    print(
        j.puntos,
        10 + ancho, 10,
        14,
        'bold 24px sans',   // Font
    )

    // Título
    // PING PONG: ⚠️ Cambiar 'BREAKOUT' por 'PING PONG'
    print(
        'BREAKOUT',
        width / 2, 8,
        0,
        'bold 30px serif',
        'center'
    );

    // Vidas — muestra corazones según la vida del jugador
    // PING PONG: ❌ Quitar — en Ping Pong no hay vidas
    let vidas = [];

    for (let i = 0; i < j.vida; i++)
    {
        vidas.push('💚');
    }
    
    print(
        vidas.join(' '),
        width - 10, 10,
        0,
        'bold 24px sans',
        'right'
    );
}

// PING PONG: ⚠️ Cambiar — reiniciar ambas paletas y la pelota
// Ahora solo reinicia 1 jugador (j) y la pelota (p)
function reset ()
{
    j.reset();
    p.reset();
}

// PING PONG: ✅ SIRVE tal cual — recorre todas las entidades y las actualiza
// El for...of recorre el array Entidad.entidades y llama update() de cada una
// update() internamente llama control() (lógica) y aplica velocidad (movimiento)
function update ()
{
    for (const entidad of Entidad.entidades)
    {
        entidad.update();
    }
}

// PING PONG: ✅ SIRVE tal cual
// 1. Actualiza la cámara (shake)
// 2. ctx.translate mueve TODO lo que se dibuja después (efecto de vibración)
// 3. Dibuja todas las entidades
// 4. Dibuja el HUD (marcador)
// 5. ctx.setTransform resetea las transformaciones para que el próximo frame empiece limpio
function draw ()
{
    const cam = Camara.getInstance();
    cam.update();

    ctx.translate(cam.x, cam.y);  // aplica desplazamiento de cámara

    for (const entidad of Entidad.entidades)
    {
        entidad.draw();
    }

    hud();

    ctx.setTransform(1, 0, 0, 1, 0, 0);  // resetear transformaciones

    // Debug: dibuja el borde del área de juego (comentado)
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

// PING PONG: ✅ SIRVE tal cual — Este es el corazón del juego
// Se ejecuta ~60 veces por segundo (60fps)
// Patrón: limpiar pantalla → actualizar lógica → dibujar todo → repetir
// requestAnimationFrame le pide al navegador que llame gameloop() en el próximo frame
function gameloop ()
{
    cls();       // limpiar pantalla

    update();    // actualizar lógica de todas las entidades
    draw();      // dibujar todo

    requestAnimationFrame(gameloop);  // repetir
}

// Área de juego — define los límites donde se mueven las entidades
// y1: 40 deja 40px arriba para el HUD (marcador, título)
// PING PONG: ✅ SIRVE — solo ajustar si querés más o menos espacio para el HUD
const area = {
    x1: 0, y1: 40,
    x2: width, y2: height,
};

// PING PONG: ⚠️ CAMBIAR — En vez de 1 Jugador, crear 2 Paletas:
// const j1 = new Paleta(/* posición arriba, teclas: W/S */)
// const j2 = new Paleta(/* posición abajo, teclas: flechas */)
const j = new Jugador();
const p = new Pelota();

// PING PONG: ❌ ELIMINAR TODO ESTO — No hay ladrillos en Ping Pong
// Este bloque calcula el tamaño y posición de cada ladrillo en una grilla
// y los crea con un doble for (filas × columnas)
// Ladrillos
const ladrillos = [];
const columnas = 8;
const filas = 4;
const margenhor = 10;
const margenver = 0;
const gap = 10;
const arealadrillos = area.x2 - area.x1 - 2 * margenhor;
const widthladri = (arealadrillos - (columnas - 1) * gap) / columnas;
const heightladri = 25;

for (let j = 0; j < filas; j++)
{
    let posy = area.y1 + margenver + j * (heightladri + gap);

    for (let i = 0; i < columnas; i++)
    {
        const ladrillo = new Ladrillo(
            area.x1 + margenhor + i * (widthladri + gap), 
            posy, 
            widthladri, 
            heightladri,
            filas - j  // las filas de arriba tienen más vidas
        );

        ladrillos.push(ladrillo);
    }
}

// Inicia el juego: reinicia posiciones y arranca el loop
// PING PONG: ✅ SIRVE
reset();
gameloop();
