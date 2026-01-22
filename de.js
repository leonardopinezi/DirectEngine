document.body.style.overflow = "hidden";
document.body.style.position = "fixed";
document.body.style.width = "100%";
document.body.style.height = "100%";

class DirectEngine {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.canvas.setAttribute("style", `
            background-color: #111;
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
        `);
        this.canvas.width = innerWidth;
        this.canvas.height = innerHeight;

        window.onresize = (e)=> {
            this.canvas.width = innerWidth;
            this.canvas.height = innerHeight;
        }

        this.Scenes = [];
        this._ActualScene = undefined;

        document.body.appendChild(this.canvas);
        this.canvas.addEventListener("contextmenu", (e)=> {
            e.preventDefault();
        });



        this.Camera = {
            x: 0,
            y: 0
        }
    }

    FollowCamera(obj_name) {
        let target = this.FindObject(obj_name, this._ActualScene.SceneName);
        if(target) {
            this.Camera.x = (target.x)
            this.Camera.y = (target.y);
        }
    }

    NewPhysicsEngine() {
        this.MatterEngine = Matter.Engine;
        this.MatterRunner = Matter.Runner;
        this.MatterBodies = Matter.Bodies;
        this.MatterComposite = Matter.Composite;
        this.MatterBody = Matter.Body;
        this.Bodies = [];

        this.Physics = this.MatterEngine.create();
        this.Runner = this.MatterRunner.create();
    }

    AddRigidBody(obj, scene) {
        let object = this.FindObject(obj, scene);
        let body = this.MatterBodies.rectangle(object.x, object.y, object.width, object.height);
        this.MatterComposite.add(this.Physics.world, [body]);
        this.Bodies.push([object.name, body]);
    }

    AddStaticBody(obj, scene) {
        let object = this.FindObject(obj, scene);
        let body = this.MatterBodies.rectangle(object.x, object.y, object.width, object.height, { isStatic: true });
        this.MatterComposite.add(this.Physics.world, [body]);
        this.Bodies.push([object.name, body]);
    }

    AddCollisionEvent(labelA, labelB, callback) {
        if(!this.Physics) return;

        Matter.Events.on(this.Physics, "collisionStart", (event) => {
            event.pairs.forEach((pair) => {
                const nameA = this.Bodies.find(b => b[1] === pair.bodyA)?.[0];
                const nameB = this.Bodies.find(b => b[1] === pair.bodyB)?.[0];

                if ((nameA === labelA && nameB === labelB) || 
                    (nameA === labelB && nameB === labelA)) {
                    callback();
                }
            });
        });
    }

    NewScene(name) {
        this.Scenes.push({
            SceneName: name || `Scene-${this.Scenes.length+1}`,
            Objects: []
        });
    }

    NewObject(obj_name, x, y, w, h, c, s) {
        let a = 0;
        while(1) {
            if(s === this.Scenes[a].SceneName) {
                this.Scenes[a].Objects.push({
                    name: obj_name,
                    x: x || 0,
                    y: y || 0,
                    width: w || 50,
                    height: h || 50,
                    src: c || "",
                    angle: 0,
                    img: new Image(),
                    Update: ()=>{}
                });

                this.Scenes[a].Objects[this.Scenes[a].Objects.length-1].img.src = this.Scenes[a].Objects[this.Scenes[a].Objects.length-1].src;

                break;
            }

            if(a >= this.Scenes.length) {
                break;
            } else a++;
        }
    }

    Destroy(obj, scene) {
        if(this.Physics) {
            let body = this.FindBody(obj);
            if(body) {
                Matter.World.remove(this.Physics.world, body);
            }
        }

        let _obj = this.FindObject(obj, scene);
        if(_obj) {
            const sc = this.Scenes.find(s => s.SceneName === scene);
            if(sc) sc.Objects.splice(sc.Objects.indexOf(_obj), 1);
        }
    }

    LoadScene(scene) {
        let a = 0;

        while(1) {
            if(scene === this.Scenes[a].SceneName) {
                this._ActualScene = this.Scenes[a];
                break;
            }

            if(a >= this.Scenes.length) {
                break;
            } else a++;
        }
    }

    SetVelocity(obj, x, y) {
        let body = this.Bodies.find(_obj => _obj[0] === obj);
        this.MatterBody.setVelocity(body[1], {
            x: x,
            y: y
        });
    }

    SetGravity(x, y) {
        if (this.Physics) {
            this.Physics.gravity.x = x;
            this.Physics.gravity.y = y;
        }
    }

    FindObject(obj, sceneName) {
        if (sceneName) {
            const sc = this.Scenes.find(s => s.SceneName === sceneName);
            return sc ? sc.Objects.find(o => o.name === obj) : undefined;
        }

        for (const sc of this.Scenes) {
            const found = sc.Objects.find(o => o.name === obj);
            if (found) return found;
        }


        return undefined;
    }

    FindBody(obj) {
        const pair = this.Bodies.find(b => b[0] === obj);
        if (pair) return pair[1];

        return undefined;
    }

    FixRotation(obj) {
        let body = this.Bodies.find(_obj => _obj[0] === obj);
        this.MatterBody.setInertia(body[1], Infinity);
    }

    Step() {
        this.ctx.clearRect(0, 0, innerWidth, innerHeight);

        if (this.Physics) {
            this.MatterEngine.update(this.Physics, 1000 / 60);
            
            for (const [name, body] of this.Bodies) {
                let objVisual = this.FindObject(name, this._ActualScene.SceneName);
                if (objVisual) {
                    objVisual.x = body.position.x;
                    objVisual.y = body.position.y;
                    objVisual.angle = body.angle * (180 / Math.PI);
                }
            }
        }

        if (this._ActualScene) {
            this._ActualScene.Objects.forEach((obj) => {
                this.ctx.save();
                
                let posX = (obj.x - this.Camera.x) + innerWidth / 2;
                let posY = (obj.y - this.Camera.y) + innerHeight / 2;

                if (obj.Update) obj.Update();
                
                this.ctx.translate(posX, posY);
                this.ctx.rotate(Math.PI / 180 * obj.angle);
                this.ctx.drawImage(obj.img, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
                this.ctx.restore();
            });
        }
    }
}

class DirectGui {
    constructor() {
        this.Interfaces = [];
        this.Inputs = {};
    }

    NewButton(name, x, y, width, height, event=()=>{}) {
        let button = document.createElement("button");
        button.id = name;

        button.setAttribute("style", `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: ${width}px;
            height: ${height}px;
            background-color: #0008;
            color: #fff;
            border: 0;
            cursor: pointer;
            font-family: monospace;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        `);

        button.addEventListener("click", event);

        button.addEventListener("pointerdown", (e)=> {
            button.style.backgroundColor = "#3338";
            this.Inputs[name] = true;
            event(e);
        });

        button.addEventListener("pointerup", (e)=> {
            button.style.backgroundColor = "#0008";
            this.Inputs[name] = false;
        });

        button.addEventListener("pointerleave", (e)=> {
            button.style.backgroundColor = "#0008";
            this.Inputs[name] = false;
        });


        button.innerText = name;
        this.Interfaces.push(button);
        document.body.appendChild(button);
    }

    IsDown(name) {
        return !!this.Inputs[name];
    }
}

class DirectKeyboard {
    constructor() {
        this.KeysPressed = {};

        addEventListener("keydown", (e)=> {
            this.KeysPressed[e.key] = true;
        });

        addEventListener("keyup", (e)=> {
            this.KeysPressed[e.key] = false;
        });
    }

    IsDown(key) {
        return !!this.KeysPressed[key];
    }
}
