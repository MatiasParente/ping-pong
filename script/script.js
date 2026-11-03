console.log('Ping Pong - Club Nacional de Football');

// Obtenemos el canvas y su contexto
const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');
const { width, height } = lienzo;

// Botón de inicio
const btnIniciar = document.getElementById('btnIniciar');

// Define los límites donde se mueven las entidades (debajo del marcador superior)
const area = {
    x1: 0, 
    y1: 36,
    x2: width, 
    y2: height,
};

let juegoIniciado = false;
let juegoFinalizado = false;

// Variables para la espera de 2 segundos tras un gol
let tiempoEsperaGol = 0;
let mensajeGol = '';

// Colores del Club Nacional de Football
const colores = [
    '#ffffff', // 0: Blanco
    '#ff0000', // 1: Rojo
    '#002d72', // 2: Azul Nacional
    '#00183b', // 3: Azul Oscuro tablero
    '#CF0028', // 4: Rojo Tricolor
    '#000000'  // 5: Negro
];

// -------------------------------------------------------------
// PRE-CARGA DE IMÁGENES
// -------------------------------------------------------------
const imgPelota = new Image();
imgPelota.src = 'imagenes/pelota.png';

const imgEscudo = new Image();
imgEscudo.src = 'imagenes/Escudo_del_Club_Nacional_de_Football.svg.png';

// Imágenes para los Power-ups
const imgMejia = new Image();
imgMejia.src = 'imagenes/mejia.jpg';

const imgMaxi = new Image();
imgMaxi.src = 'imagenes/maxi.jpeg';

const imgVillalba = new Image();
imgVillalba.src = 'imagenes/villalba.jpg';

// -------------------------------------------------------------
// SISTEMA DE AUDIO ORIGINAL (Exacto al original)
// -------------------------------------------------------------
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

    const s = A.createBufferSource();
    
    s.buffer = m;
    s.connect(A.destination);
    s.start();
}

// Limpia el canvas
function cls ()
{
    ctx.clearRect(0, 0, width, height);
}

// Número aleatorio entre 0 y max
function rnd (max)
{
    return Math.random() * max;
}

// Dibuja un rectángulo coloreado
function rectFill (x1, y1, x2, y2, color)
{
    ctx.fillStyle = colores[ color ];
    ctx.fillRect(
        x1, y1,
        Math.max(x1, x2) - Math.min(x1, x2),
        Math.max(y1, y2) - Math.min(y1, y2)
    );
}

// Dibuja un círculo coloreado
function circFill (x, y, r, color)
{
    ctx.fillStyle = colores[ color ];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

// Escribe texto en el lienzo con alineación explícita
function print (txt, x, y, c, font = 'bold 30px sans', align = 'left', baseline = 'top')
{
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillStyle = colores[ c ];
    ctx.fillText(txt, x, y);
}

// Detecta colisiones entre dos entidades usando AABB
function colision (a, b)
{
    return !(
        a.x + a.hitbox.x1 > b.x + b.hitbox.x2
        || a.x + a.hitbox.x2 < b.x + b.hitbox.x1
        || a.y + a.hitbox.y1 > b.y + b.hitbox.y2
        || a.y + a.hitbox.y2 < b.y + b.hitbox.y1
    );
}

// Lee el estado de los controles
function btn (boton)
{
    const i = Control.getInstance();
    return i[ boton ];
}

// Manejador singleton de teclado
class Control
{
    static instance = null;

    up = false;
    down = false;
    x = false;
    o = false;
    g = false;
    w = false;
    s = false;

    constructor ()
    {
        window.addEventListener('keyup',    this.manageControl.bind(this));
        window.addEventListener('keydown',  this.manageControl.bind(this));
    }

    static getInstance ()
    {
        if (Control.instance === null) 
        {
            Control.instance = new Control();
        }
        return Control.instance;
    }

    manageControl (evt)
    {
        const presionando = evt.type == 'keydown';

        switch (evt.code)
        {
            case 'ArrowUp':
                this.up = presionando;
                break;
            case 'ArrowDown':
                this.down = presionando;
                break;
            case 'KeyW':
                this.w = presionando;
                break;
            case 'KeyS':
                this.s = presionando;
                break;
            case 'KeyZ':
                this.o = presionando;
                break;
            case 'KeyX':
                this.x = presionando;
                break;
            case 'KeyG':
                this.g = presionando;
                break;
        }
    }
}

// Efecto de cámara y sacudida
class Camara 
{
    #x = 0;
    #y = 0;
    #shake = 0;

    static #instancia = null;

    constructor ()
    {
        // Tinte suave semitransparente para que no tape la pantalla por completo
        this.overlayColor = 'rgba(207, 0, 40, 0.25)';
    }

    static getInstance ()
    {
        if (Camara.#instancia === null)
        {
            Camara.#instancia = new Camara();
        }
        return Camara.#instancia;
    }

    get x () { return this.#x; }
    set x (valor) { this.#x = valor; return this.#x; }
    get y () { return this.#y; }
    set y (valor) { this.#y = valor; return this.#y; }

    shake (frames)
    {
        this.#shake = frames;
        overlays.push(this.overlayColor);
    }

    update ()
    {
        if (this.#shake > 0)
        {
            this.#shake--;
            this.x = Math.random() * 16 - 8;
            this.y = Math.random() * 16 - 8;
        }
        else
        {
            this.x = 0;
            this.y = 0;
            const ind = overlays.indexOf(this.overlayColor);
            if (ind !== -1) overlays.splice(ind, 1);
        }
    }
}

// Clase base para entidades
class Entidad
{
    static entidades = [];

    #x = 0;
    #y = 0;
    #width = 0;
    #height = 0;

    constructor ()
    {
        this.color = 0;
        this.dx = 0;
        this.dy = 0;

        this.hitbox = {
            x1: 0, y1: 0, x2: 0, y2: 0
        };

        Entidad.entidades.push(this);
    }

    get x () { return this.#x; }
    set x (valor) { this.#x = valor; return this.#x; }

    get y () { return this.#y; }
    set y (valor) { this.#y = valor; return this.#y; }

    get width () { return this.#width; }
    set width (valor)
    {
        this.#width = valor;
        this.hitbox.x2 = valor;
        return this.#width;
    }

    get height () { return this.#height; }
    set height (valor)
    {
        this.#height = valor;
        this.hitbox.y2 = valor;
        return this.#height;
    }

    control () {}

    update ()
    {
        this.control();

        this.x += this.dx;
        this.y += this.dy;

        if (this.vida <= 0)
        {
            const ind = Entidad.entidades.indexOf(this);
            if (ind !== -1) Entidad.entidades.splice(ind, 1);

            if (this.onDeath !== undefined)
            {
                this.onDeath();
            }
        }
    }

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

// Clase para las paletas de los jugadores con diseño Tricolor
class Jugador extends Entidad
{
    constructor (teclaArriba, teclaAbajo, posX, esLocal = true)
    {
        super();

        this.width = 18;   
        this.height = 110;  
        this.color = 0;
        this.esLocal = esLocal; // true para Jugador 1 (Nacional), false para Jugador 2 (Rival)

        this.tecArriba = teclaArriba;
        this.tecAbajo = teclaAbajo;
        this.posInicialX = posX;
        
        this.x = posX;
        this.y = area.y1 + (area.y2 - area.y1) / 2 - this.height / 2;
        this.vel = 5;
        this.puntos = 0; 
    }

    control ()
    {
        this.dy = 0;

        if (btn(this.tecArriba)) this.dy = -this.vel;
        if (btn(this.tecAbajo)) this.dy = this.vel;
        
        // Evita que la paleta salga de los límites del campo
        if (this.y < area.y1)
        {
            this.y = area.y1;
            this.dy = 0;
        }

        if (this.y > area.y2 - this.height)
        {
            this.y = area.y2 - this.height;
            this.dy = 0;
        }
    }

    reset ()
    {
        this.x = this.posInicialX;
        this.y = area.y1 + (area.y2 - area.y1) / 2 - this.height / 2;
    }

    draw ()
    {
        ctx.save();
        const r = 5;

        // Fondo de la paleta
        ctx.fillStyle = this.esLocal ? '#002d72' : '#c8102e';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.x, this.y, this.width, this.height, r);
        } else {
            ctx.rect(this.x, this.y, this.width, this.height);
        }
        ctx.fill();

        // Borde blanco nítido
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Franja tricolor central en la paleta
        ctx.fillStyle = this.esLocal ? '#c8102e' : '#002d72';
        const franjaW = 4;
        const franjaX = this.x + (this.width - franjaW) / 2;
        ctx.fillRect(franjaX, this.y + 12, franjaW, this.height - 24);

        ctx.restore();
    }
}

// Cartel para final de partida
class Cartel extends Entidad
{
    constructor (txt, fg, bg)
    {
        super();

        this.x = 0;
        this.y = height / 3;
        this.height = this.y;      
        this.width = width;        

        this.txt = txt;
        this.color = fg;
        this.bg = bg;
    }

    draw ()
    {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
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
            this.txt, this.x + this.width / 2, this.y + this.height / 2 - 10, 
            this.color, 'bold 36px sans', 'center', 'center'
        );

        print(
            'Presiona "G" o el botón para jugar de nuevo', this.x + this.width / 2, this.y + this.height / 2 + 30, 
            0, 'bold 18px sans', 'center', 'center'
        );
    }
}

// -------------------------------------------------------------
// CONTROLADORES DE POWER-UPS Y ESTADO
// -------------------------------------------------------------
let timeoutEfectoPowerUp = null;
let mensajePowerUp = '';
let tiempoMensajePowerUp = 0;

// Cantidad máxima de power-ups que pueden estar en pantalla a la vez
const MAX_POWERUPS = 1;

function mostrarMensajePowerUp (texto)
{
    mensajePowerUp = texto;
    tiempoMensajePowerUp = 180; // 3 segundos en pantalla
}

function limpiarEfectosPowerUp ()
{
    if (timeoutEfectoPowerUp)
    {
        clearTimeout(timeoutEfectoPowerUp);
        timeoutEfectoPowerUp = null;
    }
    p.congelada = false;
    p.enTurbo = false;
    mensajePowerUp = '';
    tiempoMensajePowerUp = 0;
}

// clase para las habilidades
class PowerUp extends Entidad
{
    constructor (tipo, x, y)
    {
        super();
        this.tipo = tipo; // mejia, maxi, villalba
        this.x = x;
        this.y = y;
        this.width = 46;
        this.height = 46;
        this.hitbox = { x1: 2, y1: 2, x2: 44, y2: 44 };
        this.vida = 1;

        if (tipo === 'mejia') this.img = imgMejia;
        else if (tipo === 'maxi') this.img = imgMaxi;
        else if (tipo === 'villalba') this.img = imgVillalba;
    }

    activar (pelota)
    {
        sonido(0);

        if (this.tipo === 'mejia')
        {
            // la pelota se congela por 3 segundos
            limpiarEfectosPowerUp();
            // Guardamos la velocidad previa
            const vxGuardada = pelota.dx || (pelota.x < width / 2 ? 4.5 : -4.5);
            const vyGuardada = pelota.dy || 2;

            pelota.congelada = true;
            pelota.dx = 0;
            pelota.dy = 0;
            mostrarMensajePowerUp('¡ATAJA MEJIA (3s)!');

            timeoutEfectoPowerUp = setTimeout(() => {
                pelota.dx = vxGuardada;
                pelota.dy = vyGuardada;
                pelota.congelada = false;
                timeoutEfectoPowerUp = null;
            }, 3000);
        }
        else if (this.tipo === 'maxi')
        {
            // tiro potente hacia adelante
            limpiarEfectosPowerUp();
            const dirX = Math.sign(pelota.dx) || (pelota.x < width / 2 ? 1 : -1);
            pelota.dx = dirX * 12;
            pelota.dy = (Math.random() * 6 - 3); // direccion frontal
            mostrarMensajePowerUp('¡TIRO DE MAXI!');
        }
        else if (this.tipo === 'villalba')
        {
            // la habilidad de villalba hace que vaya la pelota mas rapido por pocos segundos
            limpiarEfectosPowerUp();
            pelota.enTurbo = true;
            pelota.dx *= 1.8;
            pelota.dy *= 1.8;
            mostrarMensajePowerUp('¡VELOCIDAD DE VILLALBA (5s)!');

            timeoutEfectoPowerUp = setTimeout(() => {
                pelota.dx /= 1.8;
                pelota.dy /= 1.8;
                pelota.enTurbo = false;
                timeoutEfectoPowerUp = null;
            }, 5000);
        }

        this.vida = 0; //se elimina de la cancha
    }

    draw ()
    {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const r = this.width / 2;

        ctx.save();

        // Resplandor exterior característico de cada power-up
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        if (this.tipo === 'mejia') ctx.fillStyle = '#00f0ff'; //hielo
        else if (this.tipo === 'maxi') ctx.fillStyle = '#ff3b30'; //tiro potente
        else ctx.fillStyle = '#ffcc00'; // velocidad villalba
        ctx.fill();

        // Borde blanco
        ctx.beginPath();
        ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        //recorte circular de la imagen del jugador
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        if (this.img && this.img.complete && this.img.naturalWidth !== 0) {
            ctx.drawImage(this.img, cx - r, cy - r, this.width, this.height);
        } else {
            ctx.fillStyle = colores[2];
            ctx.fillRect(cx - r, cy - r, this.width, this.height);
        }

        ctx.restore();
    }
}

// generador de powerups
let contadorSpawnPowerUp = 0;
function gestionarPowerUps ()
{
    // No generar si el juego no empezó, si terminó o si estamos en pausa tras un gol
    if (!juegoIniciado || juegoFinalizado || tiempoEsperaGol > 0) return;

    //limite de powerups a la vez
    const cantidadActual = Entidad.entidades.filter(e => e instanceof PowerUp).length;
    if (cantidadActual >= MAX_POWERUPS) return;

    contadorSpawnPowerUp++;
    // aparecen aproximadamente cada 8 segundos
    if (contadorSpawnPowerUp >= 480)
    {
        contadorSpawnPowerUp = 0;
        const tipos = ['mejia', 'maxi', 'villalba'];
        const tipoElegido = tipos[Math.floor(Math.random() * tipos.length)];

        // Coordenadas aleatorias en la la cancha
        const posX = 240 + Math.random() * 320;
        const posY = area.y1 + 45 + Math.random() * (area.y2 - area.y1 - 100);

        new PowerUp(tipoElegido, posX, posY);
    }
}

//clase pelota
class Pelota extends Entidad
{
    constructor ()
    {
        super();

        this.width = 30;
        this.height = this.width;
        this.color = 0;

        this.hitbox = {
            x1: 2, y1: 2, x2: 28, y2: 28
        };
        this.vel = 4.5;
        this.rotacion = 0;
        this.congelada = false;
        this.enTurbo = false;
    }

    control ()
    {
        // reiniciar juego si termino al precionar g
        if (juegoFinalizado && btn('g'))
        {
            iniciarOSacar();
            return;
        }

        //pausa obligatoria de 2 segundos cuando se hace un gol
        if (tiempoEsperaGol > 0)
        {
            tiempoEsperaGol--;
            const segsRestantes = Math.ceil(tiempoEsperaGol / 60);
            mensajePowerUp = `${mensajeGol}, reanudando en ${segsRestantes}...`;
            tiempoMensajePowerUp = 2;

            if (tiempoEsperaGol === 0)
            {
                mensajePowerUp = '';
                tiempoMensajePowerUp = 0;
                lanzarPelota();
            }
            return; // Mientras espera los 2 segundos la pelota permanece inmóvil
        }

        // si la pelota está congelada por mejia
        if (this.congelada)
        {
            return;
        }

        // si la pelota está quieta y se presiona G o botón para sacar
        if (this.dx === 0 && this.dy === 0 && !juegoFinalizado && (btn('g') || juegoIniciado))
        {
            lanzarPelota();
        }

        // Rotación de la pelota
        if (this.dx !== 0 && !this.congelada) {
            this.rotacion += this.dx * 0.05;
        }

        // Gol del J2
        if (this.x <= area.x1)
        {
            j2.puntos += 1;   
            sonido(1);  
            Camara.getInstance().shake(20); 
            anotarGol("¡GOL DEL RIVAL!");
            return;
        }

        // Gol del J1
        if (this.x >= area.x2 - this.width)
        {
            j.puntos += 1;   
            sonido(1);  
            Camara.getInstance().shake(20); 
            anotarGol("¡GOL DE NACIONAL!");
            return;
        }

        // Rebotes en paredes superior e inferior
        if (this.y <= area.y1)
        {
            this.dy = Math.abs(this.dy);
        }

        if (this.y >= area.y2 - this.height)
        {
            this.dy = -Math.abs(this.dy);                        
        }

        // Colisión con otras entidades
        for (const e of Entidad.entidades)
        {
            if (e === this) continue;

            // Colisión con habilidad
            if (e instanceof PowerUp && colision(this, e))
            {
                e.activar(this);
                continue;
            }

            // Colisión con paleta
            if (colision(this, e)) this.onColision(e);
        }
    }

    reset ()
    {
        this.x = area.x1 + (area.x2 - area.x1) / 2 - this.width / 2;
        this.y = area.y1 + (area.y2 - area.y1) / 2 - this.height / 2;
        this.dx = 0;
        this.dy = 0;   
        this.vel = 4.5; // restablecer velocidad con el gol
        this.congelada = false;
        this.enTurbo = false;
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

        // para que aumente la velocidad
        if (entidad instanceof Jugador && !this.enTurbo && !this.congelada)
        {
            this.dx *= 1.05;
            this.dy *= 1.05;
        }

        // Sonido de rebote
        sonido(0); 

        if (entidad.onColision !== undefined)
        {
            entidad.onColision(this);
        }
    }

    draw ()
    {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        //habilidad de congelacion de mejia
        if (this.congelada)
        {
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2 + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
            ctx.fill();
        }
        //habilidad de villalba cuando esta activa
        if (this.enTurbo)
        {
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2 + 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 204, 0, 0.6)';
            ctx.fill();
        }

        ctx.rotate(this.rotacion);

        if (imgPelota.complete && imgPelota.naturalWidth !== 0) {
            ctx.drawImage(imgPelota, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = colores[0];
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Overlays para la cámara
const overlays = [];

//para cuando hacemos gol y que espere los 2 segundos
function anotarGol (mensaje)
{
    // Si algun jugador llego a 10 puntos termina el partido
    if (j.puntos >= 10 || j2.puntos >= 10)
    {
        p.dx = 0;
        p.dy = 0;
        juegoFinalizado = true;
        juegoIniciado = false;
        actualizarBotonIniciar();
        limpiarEfectosPowerUp();
        if (j.puntos >= 10) new Cartel("¡GANÓ NACIONAL!", 0, 2);
        else new Cartel("¡GANÓ EL RIVAL!", 0, 4);
        return;
    }

    // Reinicia posiciones de pelota y paletas al centro
    reset();

    //cuenta de espera de 2 segundos
    tiempoEsperaGol = 120;
    mensajeGol = mensaje;
}

// Disparo de la pelota
function lanzarPelota ()
{
    juegoIniciado = true;
    actualizarBotonIniciar();
    const dirX = Math.random() > 0.5 ? 1 : -1;
    const dirY = (Math.random() * 1.4 - 0.7);
    p.dx = dirX * p.vel;
    p.dy = dirY * p.vel;
}

// Dibuja la cancha de fútbol
function dibujaCancha ()
{
    const altoCampo = area.y2 - area.y1;

    // Césped
    const franjas = 10;
    const anchoFranja = width / franjas;
    for (let i = 0; i < franjas; i++) {
        ctx.fillStyle = (i % 2 === 0) ? '#1f6e3a' : '#195c30';
        ctx.fillRect(i * anchoFranja, area.y1, anchoFranja, altoCampo);
    }

    // Coordenadas
    const margenX = 18;
    const margenY = 16;
    const fx1 = margenX;
    const fy1 = area.y1 + margenY;
    const fx2 = width - margenX;
    const fy2 = area.y2 - margenY;
    const centerX = width / 2;
    const centerY = fy1 + (fy2 - fy1) / 2;

    //Escudo en el centro de la cancha
    if (imgEscudo.complete && imgEscudo.naturalWidth !== 0) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        const tamEscudo = 125;
        ctx.drawImage(imgEscudo, centerX - tamEscudo / 2, centerY - tamEscudo / 2, tamEscudo, tamEscudo);
        ctx.restore();
    }

    //Lineas blancas de la cancha
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2.5;

    // Perimetro
    ctx.strokeRect(fx1, fy1, fx2 - fx1, fy2 - fy1);

    //Linea de medio campo
    ctx.beginPath();
    ctx.moveTo(centerX, fy1);
    ctx.lineTo(centerX, fy2);
    ctx.stroke();

    // Círculo central
    ctx.beginPath();
    ctx.arc(centerX, centerY, 65, 0, Math.PI * 2);
    ctx.stroke();

    // Punto central de saque
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();

    // Áreas Grandes
    const anchoAreaGrande = 110;
    const altoAreaGrande = 250;
    ctx.strokeRect(fx1, centerY - altoAreaGrande / 2, anchoAreaGrande, altoAreaGrande);
    ctx.strokeRect(fx2 - anchoAreaGrande, centerY - altoAreaGrande / 2, anchoAreaGrande, altoAreaGrande);

    // Áreas Chicas
    const anchoAreaChica = 40;
    const altoAreaChica = 120;
    ctx.strokeRect(fx1, centerY - altoAreaChica / 2, anchoAreaChica, altoAreaChica);
    ctx.strokeRect(fx2 - anchoAreaChica, centerY - altoAreaChica / 2, anchoAreaChica, altoAreaChica);

    // Puntos de penal
    ctx.beginPath();
    ctx.arc(fx1 + 80, centerY, 3.5, 0, Math.PI * 2);
    ctx.arc(fx2 - 80, centerY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Medialunas
    ctx.beginPath();
    ctx.arc(fx1 + 80, centerY, 45, -0.65, 0.65);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fx2 - 80, centerY, 45, Math.PI - 0.65, Math.PI + 0.65);
    ctx.stroke();

    // Tiros de esquina
    const rCorner = 14;
    ctx.beginPath();
    ctx.arc(fx1, fy1, rCorner, 0, Math.PI / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fx1, fy2, rCorner, -Math.PI / 2, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fx2, fy1, rCorner, Math.PI / 2, Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fx2, fy2, rCorner, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // Redes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    const altoArco = 80;
    ctx.fillRect(fx1 - 10, centerY - altoArco / 2, 10, altoArco);
    ctx.strokeRect(fx1 - 10, centerY - altoArco / 2, 10, altoArco);
    ctx.fillRect(fx2, centerY - altoArco / 2, 10, altoArco);
    ctx.strokeRect(fx2, centerY - altoArco / 2, 10, altoArco);
}

// Marcador superior
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

    // Barra superior
    ctx.fillStyle = '#00183b';
    ctx.fillRect(0, 0, width, area.y1);

    //borde inferior
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(0, area.y1 - 3, width, 3);

    // Puntaje Jugador 1
    print(`NACIONAL: ${j.puntos}`, 25, 7, 0, 'bold 18px sans', 'left', 'top');

    //Puntaje Jugador 2
    print(`RIVAL: ${j2.puntos}`, width - 25, 7, 0, 'bold 18px sans', 'right', 'top');

    //Zona central del hud
    if (tiempoMensajePowerUp > 0)
    {
        tiempoMensajePowerUp--;
        print(mensajePowerUp, width / 2, 8, 1, 'bold 15px sans', 'center', 'top');
    }
    else if (!juegoIniciado && !juegoFinalizado && tiempoEsperaGol <= 0)
    {
        print('Presioná "G" para iniciar', width / 2, 8, 0, '15px sans', 'center', 'top');
    }
}

// Función para iniciar o sacar
function iniciarOSacar ()
{
    if (juegoFinalizado)
    {
        juegoFinalizado = false;
        juegoIniciado = false;
        j.puntos = 0;
        j2.puntos = 0;
        tiempoEsperaGol = 0;
        Entidad.entidades = Entidad.entidades.filter(e => !(e instanceof Cartel));
        reset();
        actualizarBotonIniciar();
        return;
    }

    if (p.dx === 0 && p.dy === 0)
    {
        tiempoEsperaGol = 0;
        lanzarPelota();
    }
}

//actualizar boton
function actualizarBotonIniciar ()
{
    if (!btnIniciar) return;

    if (juegoFinalizado)
    {
        btnIniciar.textContent = 'Jugar de nuevo (G)';
        btnIniciar.style.display = 'block';
    }
    else if (!juegoIniciado || (p.dx === 0 && p.dy === 0))
    {
        btnIniciar.textContent = 'Empezar partido (G)';
        btnIniciar.style.display = 'block';
    }
    else
    {
        btnIniciar.textContent = 'Partido iniciado';
    }
}

if (btnIniciar)
{
    btnIniciar.addEventListener('click', () => {
        iniciarOSacar();
    });
}

function reset ()
{
    limpiarEfectosPowerUp();
    //limpiar los powerups de la cancha al haber gol
    Entidad.entidades = Entidad.entidades.filter(e => !(e instanceof PowerUp));
    contadorSpawnPowerUp = 0;

    j.reset();
    j2.reset();
    p.reset();
    actualizarBotonIniciar();
}

function update ()
{
    gestionarPowerUps();

    for (const entidad of Entidad.entidades)
    {
        entidad.update();
    }
}

function draw ()
{
    const cam = Camara.getInstance();
    cam.update();

    ctx.translate(cam.x, cam.y);

    //dibujamos la cancha completa
    dibujaCancha();

    // Dibujamos todas las entidades excepto el cartel
    for (const entidad of Entidad.entidades)
    {
        if (entidad instanceof Cartel) continue;
        entidad.draw();
    }

    // hud superio
    hud();

    // Cartel final si terminó el partido
    for (const entidad of Entidad.entidades)
    {
        if (entidad instanceof Cartel) entidad.draw();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function gameloop ()
{
    cls();
    update();
    draw();
    requestAnimationFrame(gameloop);
}

// Configuración inicial
const margenPaleta = 30;
const j = new Jugador('w', 's', area.x1 + margenPaleta, true);
const j2 = new Jugador('up', 'down', area.x2 - margenPaleta - 18, false);
const p = new Pelota();

// Inicia el juego en estado pausado con puntajes a 0
reset();
actualizarBotonIniciar();
gameloop();
