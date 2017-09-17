declare function require(x: string): any;
// declare var THREE.VignetteShader: any;

import GUI from "./GUI";
import * as THREE from 'three';
import VThree from "./VThree";
import GPUComputationRenderer from './GPUComputationRenderer';
const ComputePosition = require('./GLSL/ComputePosition_Pal.frag');
const ComputeVelocity = require('./GLSL/ComputeVelocity_Pal.frag');
const vert = require('./GLSL/Pal.vert');
const frag = require('./GLSL/Pal.frag');


import 'imports-loader?THREE=three!three/examples/js/shaders/VignetteShader'
import 'imports-loader?THREE=three!three/examples/js/shaders/CopyShader'
import 'imports-loader?THREE=three!three/examples/js/postprocessing/EffectComposer'
import 'imports-loader?THREE=three!three/examples/js/postprocessing/RenderPass'
import 'imports-loader?THREE=three!three/examples/js/shaders/ConvolutionShader'
import 'imports-loader?THREE=three!three/examples/js/shaders/BleachBypassShader'
import 'imports-loader?THREE=three!three/examples/js/shaders/FilmShader'


// *********** ひとつめのシーン *********** //
export default class Scene02{
    public name:string = "scene2";
    public scene: THREE.Scene;
    public camera: THREE.Camera;
    private renderer:THREE.WebGLRenderer;
    private geometry:THREE.BoxGeometry;
    private material:THREE.MeshBasicMaterial;
    private cube:THREE.Mesh;
    private uniforms:any[] = [];
    private materials:any[] = [];
    private gui:GUI;
    private pal:any;
    // GPU Compute
    private gpuCompute:any;
    private velocityVariable:any;
    private positionVariable:any;
    private positionUniforms:any;
    private velocityUniforms;

    private TEXTURE_WIDTH:number = 320;
    private TEXTURE_HEIGHT:number = 320;



    // textured
    private plane_geometry:THREE.PlaneGeometry;
    private plane_material:THREE.ShaderMaterial;
    private plane:THREE.Mesh;
    private image_uniform:any;


    private scaleZ:number = 1.0;
    private isScaleZ:boolean = false;
    private speedScaleZ:number = 0.0001;

    private isMoveToFront_Pal:boolean = true;
    private translateZ_pal:number = 0;
    private glitchDist:number = 0.01;
    private time:number = 0;
    private _threshold:number = -999.0;
    private animationNum:number = 0.0;
    private vthree:VThree;
    private isShaderReplace:boolean = false;

    private moveFlontSpeed:number =3.0;

    private initModelPosition:THREE.Vector3 = new THREE.Vector3(0,0,0);


    private isWireGlitch:boolean = false;
    private isEnd:boolean = false;

    public isUpdate:boolean = true;
    public isShaderReplased:boolean = false;

    private composer:THREE.EffectComposer;
    private isPostProcessing:boolean = false;



    // ******************************************************
    constructor(renderer:THREE.WebGLRenderer,gui:GUI, vthree:VThree) {
        this.renderer = renderer;
        this.vthree = vthree;
        this.createScene();
        this.gui = gui;

        console.log("scene created!")
    }

    // ******************************************************
    private createScene() {

        this.scene = new THREE.Scene();


        let ambient = new THREE.AmbientLight(0xffffff);
        this.scene.add(ambient);

        let dLight = new THREE.DirectionalLight(0xffffff, 0.2);
        dLight.position.set(0, 1, 0).normalize();
        this.scene.add(dLight);

        var directionalLight = new THREE.DirectionalLight(0xffeedd);
        directionalLight.position.set(0, 0, 1).normalize();
        this.scene.add(directionalLight);


        var onProgress =  (xhr)=> {
            if (xhr.lengthComputable) {
                var percentComplete = xhr.loaded / xhr.total * 100;
                if(Math.round(percentComplete) == 100)
                {
                    this.isUpdate = true;
                    // this.replaceShader_WireWave(this.pal,0,false);

                }
                console.log(Math.round(percentComplete) + '% downloaded');
            }
        };
        var onError = function (xhr) {
        };





        let loader = new THREE.JSONLoader();

        loader.load( 'models/pal/pal_decimated.json', ( geometry, materials )=> { //第１引数はジオメトリー、第２引数はマテリアルが自動的に取得）
            var faceMaterial = new THREE.MultiMaterial( materials );
            let mesh = new THREE.Mesh( geometry, faceMaterial );
            this.pal = mesh;
            // mesh.position.set(-1,0.5,0);
            // mesh.scale.set(1.5,1,1);
            console.log("pal");
            console.log(mesh);
            this.scene.add( mesh );
        }, onProgress,onError);






        // カメラを作成
        this.camera = new THREE.PerspectiveCamera(105, window.innerWidth / window.innerHeight, 0.1, 1000);
        // カメラ位置を設定
        this.scene.scale.set(1.3, 1, 1);
        this.camera.position.y = 3;
        this.camera.position.z = 30;
        this.initComputeRenderer();

        this.initPostProcessing();


    }

    public shaderReplace()
    {
        // if(this.isShaderReplased)
        // {
            this.replaceShader_WireWave(this.pal,0,false);
        //     this.isShaderReplased = true;
        // }

    }
    public replaceShader_WireWave=(object:any,isTransparent:number, isWire:boolean)=>
    {
        if(!this.isShaderReplace)
        {

            console.log(object);

            let materials = object.material.materials;
            this.materials = materials;
            console.log(materials);
            for (let i = 0; i < materials.length; i++) {

                //let img = materials[i].map.image.src;//.attributes.currentSrc;
                console.log(materials[i]);
                console.log(materials[i].map);

                console.log(materials[i].map.image);
                let img = materials[i].map.image.currentSrc;
                let _uniforms: any = {
                    time: {value: 1.0},
                    texture: {value: new THREE.TextureLoader().load(img)},
                    transparent: {value: isTransparent},
                    threshold: {value: 0},
                    texturePosition: {value:null},
                    isDisplay:{value:true},
                    glitchVec:{value: new THREE.Vector3(1,0,0)},
                    glitchDist:{value: 0.0},
                    animationNum:{value:0}
                };

                this.uniforms.push(_uniforms);


                // materials[i].wireframe = true;
                materials[i] = new THREE.ShaderMaterial({
                    uniforms: _uniforms,
                    vertexShader: vert,
                    fragmentShader: frag,
                    wireframe: isWire,
                    transparent:true,
                    side:THREE.DoubleSide
                    // drawBuffer:true
                });
            }


            return object;

        }
    }

    public initComputeRenderer()
    {
        this.gpuCompute = new GPUComputationRenderer( this.TEXTURE_WIDTH, this.TEXTURE_HEIGHT, this.renderer );
        console.log(this.gpuCompute);
        let dtPosition = this.gpuCompute.createTexture();
        this.fillTexture(dtPosition);

        this.positionVariable = this.gpuCompute.addVariable( "texturePosition", ComputePosition, dtPosition );
        this.gpuCompute.setVariableDependencies( this.positionVariable, [ this.positionVariable ] );

        const error = this.gpuCompute.init();
        if ( error !== null ) {
            console.error( error );
        }
    }

    public fillTexture(texturePosition:any)
    {
        let posArray = texturePosition.image.data;
        for(let k = 0, k1 = posArray.length; k < k1; k+=4)
        {
            var x,y,z;
            x = 0;
            y = 0;
            z = 0;
            posArray[k+0] = x;
            posArray[k+1] = y;
            posArray[k+2] = z;
            posArray[k+3] = 0;

        }
    }


    public  initPostProcessing()
    {

        var shaderVignette = THREE.VignetteShader;
        var shaderBleach = THREE.BleachBypassShader;
        let film = THREE.FilmShader;
        film.uniforms = {

        "tDiffuse":   { value: null },
        "time":       { value: 0.0 },
        "nIntensity": { value: 0.1 },
        "sIntensity": { value: 0.01 },
        "sCount":     { value: 4096/2 },
        "grayscale":  { value: 0 }

         };

        let ConvolutionShader = THREE.ConvolutionShader;

        var shaderCopy = THREE.CopyShader;
        var effectVignette = new THREE.ShaderPass( shaderVignette );
        var effectCopy = new THREE.ShaderPass( shaderCopy );
        effectVignette.uniforms[ "offset" ].value = 0.95;
        effectVignette.uniforms[ "darkness" ].value = 1.6;
        // var effectBloom = new THREE.ShaderPass( ConvolutionShader );
        var effectFilm = new THREE.ShaderPass(film );
        var effectBleach = new THREE.ShaderPass( shaderBleach );
        effectVignette.renderToScreen = true;
        this.composer = new THREE.EffectComposer( this.renderer );
        this.composer.addPass( new THREE.RenderPass( this.scene, this.camera ) );
        // this.composer.addPass( effectBloom );
        this.composer.addPass( effectFilm );
        this.composer.addPass( effectBleach );
        this.composer.addPass( effectVignette    );

        this.isPostProcessing = true;
    }


    // ******************************************************
    public keyUp(e:KeyboardEvent)
    {

    }

    public click()
    {
        this.replaceShader_WireWave(this.pal,0,false);
        this.isShaderReplace = true;

    }


    // ******************************************************
    public keyDown(e:KeyboardEvent)
    {

        if(e.key =="Space")
        {
            this.replaceShader_WireWave(this.pal,0,false);
            this.isShaderReplace = true;
        }
        if(e.key == "p")
        {
            this.image_uniform.display.value = !this.image_uniform.display.value;
        }

        if(e.key == "m")
        {
            this.isMoveToFront_Pal = !this.isMoveToFront_Pal;
        }

        if(e.key == "d")
        {
            for(let i = 0; i < this.uniforms.length; i++)
            {
                this.uniforms[i].isDisplay.value = !this.uniforms[i].isDisplay.value;
            }
        }

        if(e.key == "t")
        {
            this._threshold = -40.0;
        }


        if(e.key == "w")
        {
            this.isWireGlitch = !this.isWireGlitch;
        }


        if(e.key == "z")
        {
            this.isScaleZ = !this.isScaleZ;
        }

        if(e.key == "a")
        {
            for(let i = 0; i < this.uniforms.length; i++)
            {
                this.uniforms[i].animationNum.value = 1;
            }
        }


        if(e.key == "e")
        {

            this.isEnd = !this.isEnd;
            // console.log(this.isEnd);
        }

        if(e.key == "r")

        {
            this.resetandgo();
        }

    }


    // ******************************************************
    public mouseMove(e:MouseEvent)
    {

    }

    // ******************************************************
    public onMouseDown(e:MouseEvent)
    {


    }

    public reset =()=>
    {

        this.isMoveToFront_Pal = false;
        this.isScaleZ = false;
        this.scaleZ = 1.0;
        this.speedScaleZ = 0.0001;
        this.isMoveToFront_Pal = false;
        this.translateZ_pal = 0;
        this.glitchDist = 0.01;
        this.time = 0;
        this._threshold = 999.0;
        this.animationNum = 0.0;
        this.moveFlontSpeed =3.0;
        this.isWireGlitch = false;

        this.isEnd = false;
        this.scene.scale.set(1.3,1,this.scaleZ);
        // this.scene.position.set(1.2,1,this.scaleZ);

        for(let i = 0; i < this.uniforms.length; i++)
        {

            this.uniforms[i].glitchDist.value = 0;
            this.materials[i].wireframe = false;
            this.uniforms[i].animationNum.value = 0;
        }

        // for(let i = 0; i < this.pal.length; i++)
        // {
        this.pal.position.set(0,0,0);
        // }


        this.pal.translateY(0);
        this.pal.translateZ(0);
        this.scene.rotation.setFromVector3(new THREE.Vector3(0,0,0));
    }


    public resetandgo =()=>
    {
        this.reset();
        this.isMoveToFront_Pal = true;


    }
    // ******************************************************


    public update(time)
    {
        if(this.isUpdate)
        {

            if(this.vthree.oscValue[1] == 0)
            {
                this.reset()
            }


            if(this.vthree.oscValue[1] == 1)
            {
                this.reset();
                // this.replaceShader_WireWave(this.pal[0],0,false);
            }

            if(this.vthree.oscValue[1] == 65)
            {
                this.isMoveToFront_Pal = true;
            }



            if(this.vthree.oscValue[1] == 66)
            {
                // this.isMoveToFront_Pal = true;
                this.isScaleZ = true;

            }


            if(this.vthree.oscValue[1] == 74)
            {
                this.scaleZ = 0;
                this.isScaleZ = false;
                this.scene.scale.set(1.3,1,1);
                // this.isMoveToFront_Pal = false;
                // this.translateZ_pal = 0;
                // this.pal[0
                // this.isWireGlitch = true;



            }


            if(this.vthree.oscValue[1] == 75)
            {
                this.isWireGlitch = true;
                // this.glitchDist = 0.01;
            }

            if(this.isWireGlitch)
            {
                this.isMoveToFront_Pal = false;
                for(let i = 0; i < this.materials.length; i++)
                {
                    this.materials[i].wireframe = !this.materials[i].wireframe;
                }

                if(Math.random() < 0.9)
                {

                    // this


                    this.glitchDist *= 1.1;

                    for(let i = 0; i < this.uniforms.length; i++)
                    {
                        // if(this.glitchDist >= Math.PI/2)
                        // {
                        //     this.glitchDist = 0.0;
                        // }
                        this.uniforms[i].glitchDist.value = this.glitchDist*20.0;
                    }
                }
            }

            if(this.vthree.oscValue[1] == 76)
            {

                this.isEnd = true;
                this.isMoveToFront_Pal = true;


            }

            if(this.isEnd)
            {
                this.scene.rotation.setFromVector3(new THREE.Vector3(4.75,0,0));
                this.glitchDist = 0.0;

                for(let i = 0; i < this.uniforms.length; i++)
                {
                    this.uniforms[i].animationNum.value = 1;

                    this.uniforms[i].glitchDist.value = Math.abs(Math.sin(this.glitchDist))*20.0;
                    this.materials[i].wireframe = false;
                }
                this.isWireGlitch = false;


                // this.isEnd = true;
                this.isMoveToFront_Pal = true;
            }


            if(this.isScaleZ)
            {
                this.speedScaleZ *= 1.1;
                this.scaleZ += this.speedScaleZ;
                if(this.scaleZ <= 25.0)
                {
                    this.scene.scale.set(1.3,1,this.scaleZ);
                }

            }

            this.renderer.setClearColor(0x000000);

            this.time++;

            this.gpuCompute.compute();
            let timerStep:number = 0.004;

            for(let i = 0; i < this.uniforms.length; i++)
            {
                //console.log(this.uniforms[i]);


                this.uniforms[i].texturePosition.value = this.gpuCompute.getCurrentRenderTarget( this.positionVariable ).texture;
                this.uniforms[i].time.value += timerStep;

            }



            if(this.isMoveToFront_Pal)
            {
                console.log(this.translateZ_pal);
                if(this.translateZ_pal < -12.5)
                {


                    // this.reset();
                    // this.isMoveToFront_Pal= true;
                    this.resetandgo();


                }
                if(this.translateZ_pal < -9.7 && this.translateZ_pal > -9.8)
                {
                    let p = Math.random();


                    if(p < 0.02)
                    {
                        if(Math.random() < 0.4)

                        {
                            this.isScaleZ = true;
                            setTimeout(this.resetandgo, 2500);
                        } else
                        {
                            this.isWireGlitch = true;
                            setTimeout(this.resetandgo, 5000);
                        }


                        this.isMoveToFront_Pal = false;
                    }
                }
                this.moveFlontSpeed += (0.0001 - this.moveFlontSpeed) * 0.3;
                this.translateZ_pal -= this.moveFlontSpeed;
                if(this.isEnd)
                {

                    this.pal.translateZ(0);
                    this.pal.translateY(this.translateZ_pal * 0.0005);
                } else {
                    this.pal.translateY(0);
                    this.pal.translateZ(-this.translateZ_pal * 0.0005);
                }

            }

            this.scene.rotation.setFromVector3(new THREE.Vector3(0,this.gui.parameters.scene_rotation_y,0));



        }
        this.composer.render();
    }

}
