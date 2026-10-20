function inner_canvas(pos) {
    return pos.x >= 0 && pos.x <= width && pos.y >= 0 && pos.y <= height;
}

class Particle {
    constructor(pos, v, rad) {
        this.pos = pos.copy();
        this.pos_before = pos.copy();
        this.v = v;
        this.a = createVector(0, 0.25); // Gravity
        this.rad = rad;
        this.life = true;
        this.count = 0;
        this.age = 0;
        this.maxAge = 160; 
        this.isStar = random() < 0.15; 
        this.starSize = random(1, 5);
    }
  
    display() {
        push();
        if (this.isStar) {
            push();
            translate(this.pos.x, this.pos.y);
            drawFourPointedStar(0, 0, this.starSize, 255);
            pop();
        } else {
            stroke(255, 255, 255, random(200, 255));
            strokeWeight(this.rad);
            point(this.pos.x, this.pos.y);
        }
        pop();

        this.pos_before = this.pos.copy();
        this.v.add(this.a);
        this.pos.add(this.v);

        let cx = width / 2;

        // 1. Top Glass Tray Collision
        if (this.pos.y >= 200 && this.pos.y <= 215 && abs(this.pos.x - cx) < 70 && this.count == 0) {
            this.v.y *= -0.3;
            this.v.x += random(-0.8, 0.8);
            this.count = 1;
        }
        // 2. Middle Glass Tray Collision
        else if (this.pos.y >= 340 && this.pos.y <= 355 && abs(this.pos.x - cx) < 115 && this.count == 1) {
            this.v.y *= -0.3;
            this.v.x += random(-0.8, 0.8);
            this.count = 2;
        }
        // 3. Bottom Wide Glass Tray Collision
        else if (this.pos.y >= 480 && this.pos.y <= 495 && abs(this.pos.x - cx) < 185 && this.count == 2) {
            this.v.y *= -0.2;
            this.v.x += random(-0.5, 0.5);
            this.count = 3;
        }

        this.age++;
        if (this.age > this.maxAge || !inner_canvas(this.pos)) {
            this.life = false;
        }
    }
}

class SurfaceParticle {
    constructor(x, y) {
        this.x = x;
        this.baseY = y;
        this.isStar = random() < 0.25; 
        this.starSize = random(1.5, 5);
        this.rad = 1.8;
        this.bobOffset = random(1000);
        this.life = true;
        this.age = 0;
        this.maxAge = random(200, 350);
    }

    update() {
        this.age++;
        if (this.age > this.maxAge) {
            this.life = false;
        }
    }

    display() {
        let displayY = this.baseY + sin(frameCount * 0.07 + this.bobOffset) * 1.2;
        push();
        if (this.isStar) {
            drawFourPointedStar(this.x, displayY, this.starSize, 220);
        } else {
            stroke(255, 255, 255, 220);
            strokeWeight(this.rad);
            point(this.x, displayY);
        }
        pop();
    }
}

class StreamParticle {
    constructor(x, y, flightVel) {
        this.pos = createVector(x, y);
        this.vel = flightVel.copy().mult(-0.1).add(p5.Vector.random2D().mult(0.2));
        this.alpha = 180;
        this.size = random(0.5, 1.5); 
        this.decay = 8;
    }

    update() {
        this.pos.add(this.vel);
        this.vel.mult(0.92); 
        this.alpha -= this.decay;
    }

    render() {
        if (this.alpha > 0) {
            drawFourPointedStar(this.pos.x, this.pos.y, this.size, this.alpha);
        }
    }
}

class Butterfly2D {
    constructor(pos, vel) {
        this.pos = pos.copy();
        this.vel = vel.copy();
        this.acc = createVector(0, 0);
        this.maxForce = 0.25;
        this.maxSpeed = 4.5;
        this.perceptionRadius = 100;
        this.flapSpeed = random(0.2, 0.32);
        this.flapOffset = random(TWO_PI);
        this.scaleFactor = random(0.4, 0.55); 
        this.streamParticles = [];
    }

    flock(boids) {
        let alignment = createVector(0, 0);
        let cohesion = createVector(0, 0);
        let separation = createVector(0, 0);
        let neighbors = 0;

        for (let other of boids) {
            let d = this.pos.dist(other.pos);
            if (other !== this && d < this.perceptionRadius) {
                alignment.add(other.vel);
                cohesion.add(other.pos);
                let pushAway = p5.Vector.sub(this.pos, other.pos);
                pushAway.div(max(d * d, 1)); 
                separation.add(pushAway);
                neighbors++;
            }
        }

        if (neighbors > 0) {
            alignment.div(neighbors);
            alignment.setMag(this.maxSpeed);
            alignment.sub(this.vel);
            alignment.limit(this.maxForce);

            cohesion.div(neighbors);
            cohesion.sub(this.pos);
            cohesion.setMag(this.maxSpeed);
            cohesion.sub(this.vel);
            cohesion.limit(this.maxForce);

            separation.div(neighbors);
            separation.setMag(this.maxSpeed);
            separation.sub(this.vel);
            separation.limit(this.maxForce);

            this.acc.add(alignment.mult(1.0));
            this.acc.add(cohesion.mult(1.0));
            this.acc.add(separation.mult(1.8));
        }

        let topSource = createVector(width / 2, 135);
        let toSource = p5.Vector.sub(topSource, this.pos);
        let distToSource = toSource.mag();

        if (distToSource > 70) {
            toSource.normalize();
            toSource.mult(this.maxSpeed);
            let steer = p5.Vector.sub(toSource, this.vel);
            steer.limit(this.maxForce * 2.0);
            this.acc.add(steer);
        } else {
            let perp = createVector(-toSource.y, toSource.x).normalize().mult(random(0.8, 2.0));
            this.acc.add(perp);
        }
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        
        let tailOffset = this.vel.copy().normalize().mult(-6);
        this.streamParticles.push(new StreamParticle(this.pos.x + tailOffset.x, this.pos.y + tailOffset.y, this.vel));

        if (this.streamParticles.length > 12) {
            this.streamParticles.shift();
        }

        for (let i = this.streamParticles.length - 1; i >= 0; i--) {
            this.streamParticles[i].update();
            if (this.streamParticles[i].alpha <= 0) {
                this.streamParticles.splice(i, 1);
            }
        }

        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    render() {
        for (let p of this.streamParticles) {
            p.render();
        }

        push();
        translate(this.pos.x, this.pos.y);

        let flightHeading = this.vel.heading() + HALF_PI;
        rotate(flightHeading);
        scale(this.scaleFactor);

        let flapCycle = frameCount * this.flapSpeed + this.flapOffset;
        let flapCoeff = cos(flapCycle); 
        let wingSpanScale = map(abs(flapCoeff), 0, 1, 0.15, 1.0); 

        noStroke();
        fill(255, 255, 255, 22);
        ellipse(0, 0, 65 * wingSpanScale, 70);
        fill(200, 230, 255, 10);
        ellipse(0, 0, 90 * wingSpanScale, 95);

        push();
        scale(wingSpanScale, 1.0); 
        drawTransparentParticleWing();
        pop();

        push();
        scale(-wingSpanScale, 1.0); 
        drawTransparentParticleWing();
        pop();

        fill(200, 220, 255, 140);
        noStroke(0);
        ellipse(0, 3, 4, 24);

        fill(245, 250, 255, 250);
        stroke(255, 255, 255, 220);
        strokeWeight(0);
        rectMode(CENTER);
        rect(0, 2, 2.5, 16, 1.2); 

        stroke(255, 255, 255, 220);
        strokeWeight(0);
        noFill();
        strokeCap(ROUND);
        line(-0.5, 0, -4, -13);
        line(0.5, 0, 4, -13);

        pop();
    }
}

function drawFourPointedStar(x, y, sz, alpha) {
    push();
    noStroke();
    fill(255, 255, 255, alpha * 0.3);
    ellipse(x, y, sz * 2.2, sz * 2.2);

    fill(255, 255, 255, alpha);
    beginShape();
    vertex(x, y - sz * 1.3);
    vertex(x + sz * 0.25, y);
    vertex(x, y + sz * 1.3);
    vertex(x - sz * 0.25, y);
    endShape(CLOSE);

    beginShape();
    vertex(x - sz * 1.3, y);
    vertex(x, y + sz * 0.25);
    vertex(x + sz * 1.3, y);
    vertex(x, y - sz * 0.25);
    endShape(CLOSE);
    pop();
}

function drawTransparentParticleWing() {
    noStroke();
    fill(255, 255, 255, 25);
    renderWingPath();

    noFill();
    stroke(255, 255, 255, 120);
    strokeWeight(0.3);
    beginShape();
    vertex(1, -2);
    bezierVertex(6, -8, 12, -12, 18, -14);
    endShape();

    beginShape();
    vertex(1, 2);
    bezierVertex(8, 6, 12, 12, 14, 18);
    endShape();

    drawWingParticleOutline();
}

function drawWingParticleOutline() {
    let p0 = createVector(0, -2);
    let cp1_1 = createVector(4, -12), cp1_2 = createVector(12, -22), p1 = createVector(24, -24);
    let cp2_1 = createVector(30, -22), cp2_2 = createVector(32, -10), p2 = createVector(24, -2);
    let cp3_1 = createVector(18, 2), cp3_2 = createVector(14, 4), p3 = createVector(16, 10);
    let cp4_1 = createVector(20, 18), cp4_2 = createVector(22, 26), p4 = createVector(14, 28);
    let cp5_1 = createVector(6, 28), cp5_2 = createVector(2, 16), p5 = createVector(0, 4);

    let segments = [
        [p0, cp1_1, cp1_2, p1],
        [p1, cp2_1, cp2_2, p2],
        [p2, cp3_1, cp3_2, p3],
        [p3, cp4_1, cp4_2, p4],
        [p4, cp5_1, cp5_2, p5]
    ];

    noStroke();
    for (let seg of segments) {
        let steps = 7;
        for (let i = 0; i <= steps; i++) {
            let t = i / steps;
            let x = bezierPoint(seg[0].x, seg[1].x, seg[2].x, seg[3].x, t);
            let y = bezierPoint(seg[0].y, seg[1].y, seg[2].y, seg[3].y, t);
            
            let twinkle = sin(frameCount * 0.25 + x * 0.5 + y * 0.5) * 0.5 + 0.5;
            let pSize = map(twinkle, 0, 1, 0.5, 1.5);
            let pAlpha = map(twinkle, 0, 1, 100, 240);

            fill(255, 255, 255, pAlpha);
            ellipse(x, y, pSize, pSize);
        }
    }
}

function renderWingPath() {
    beginShape();
    vertex(0, -2); 
    bezierVertex(4, -12, 12, -22, 24, -24); 
    bezierVertex(30, -22, 32, -10, 24, -2);  
    bezierVertex(18, 2, 14, 4, 16, 10);      
    bezierVertex(20, 18, 22, 26, 14, 28);  
    bezierVertex(6, 28, 2, 16, 0, 4);      
    endShape(CLOSE);
}

let particle_arr = [];
let surfaceParticles = [];
let butterflies = [];
const numButterflies = 2;

function setup() {
    let arCanvas = createCanvas(600, 600);
    arCanvas.id('p5-canvas');

    let container = document.getElementById('p5-container');
    if (container) {
        arCanvas.parent('p5-container');
    }

    colorMode(RGB, 255);

    let cx = width / 2;
    for (let i = 0; i < numButterflies; i++) {
        let initialPos = createVector(
            cx + random(-30, 30),
            135 + random(-20, 20)
        );
        let initialVel = p5.Vector.random2D().mult(random(2.0, 3.5));
        butterflies.push(new Butterfly2D(initialPos, initialVel));
    }
}

function draw() {
    background(22, 66, 250);

    let cx = width / 2;

    drawFountainStems();

    if (surfaceParticles.length < 250) {
        let basinChoice = random();
        if (basinChoice < 0.25) {
            surfaceParticles.push(new SurfaceParticle(cx + random(-65, 65), 208));
        } else if (basinChoice < 0.55) {
            surfaceParticles.push(new SurfaceParticle(cx + random(-105, 105), 348));
        } else {
            surfaceParticles.push(new SurfaceParticle(cx + random(-165, 165), 488));
        }
    }

    for (let i = surfaceParticles.length - 1; i >= 0; i--) {
        surfaceParticles[i].update();
        surfaceParticles[i].display();
        if (!surfaceParticles[i].life) {
            surfaceParticles.splice(i, 1);
        }
    }

    let generate_num = 6;
    for (let i = 0; i < generate_num; i++) {
        let spawnX = cx + random(-2, 2);
        let spawnY = 115;
        
        let r = random();
        if (r < 0.15) {
            spawnX = cx + random(-15, 15);
            spawnY = 215;
        } else if (r < 0.25) {
            spawnX = cx + random(-20, 20);
            spawnY = 355;
        }

        let pos = createVector(spawnX, spawnY);
        let v = createVector(random(-1.5, 1.5), random(-2.5, -0.8));
        particle_arr.push(new Particle(pos, v, 1.8));
    }

    for (let i = particle_arr.length - 1; i >= 0; i--) {
        particle_arr[i].display();
        if (!particle_arr[i].life) {
            particle_arr.splice(i, 1);
        }
    }

    drawTransparentGlassFountain();

    for (let b of butterflies) {
        b.flock(butterflies);
        b.update();
        b.render();
    }
}

function drawFountainStems() {
    let cx = width / 2;
    push();
    noStroke();
    fill(130, 190, 255, 30);

    rect(cx - 4, 115, 8, 85);   
    rect(cx - 8, 235, 16, 105); 
    rect(cx - 12, 375, 24, 105); 
    pop();
}

function drawTransparentGlassFountain() {
    let cx = width / 2;
  
    push();
    stroke(220, 245, 255, 210);
    strokeWeight(0);
    fill(130, 190, 255, 35); 

    rect(cx - 4, 105, 8, 22);
    ellipse(cx, 102, 22, 22);

    rect(cx - 75, 200, 150, 35, 8);
    rect(cx - 125, 340, 250, 35, 8);
    rect(cx - 195, 480, 390, 35, 10);

    noStroke();
    fill(165, 220, 255, 90);
    ellipse(cx, 208, 142, 12);
    ellipse(cx, 348, 242, 12);
    ellipse(cx, 488, 380, 16);

    pop();
}

function mouseClicked() {
    save("img_" + month() + '-' + day() + '_' + hour() + '-' + minute() + '-' + second() + ".jpg");
}