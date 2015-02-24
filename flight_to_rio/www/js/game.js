/*
* 
* 	game.js
* 
* 	Created by Dries Van Schevensteen on 23/02/15.
*
*/

(function() {

	var physics, multiplier, cannon, scale;

	function init() {

		console.log('init CreateJS');

		var canvas = document.getElementById("gameCanvas");

	    physics = window.physics = new Physics(canvas);
		
		// physics.debug();

		scale = physics.scale / 2;
		console.log("Scale: " + scale);

	 	physics.stage = new createjs.Stage(canvas);

	 	physics.stage.on("stagemousemove", mouseMove);
		physics.stage.on("stagemouseup", stageMouseUp);

		physics.stage.canvas.width = $(window).width();
		physics.stage.canvas.height = $(window).height();
		console.log("Width: " + physics.stage.canvas.width  + " Height: " + physics.stage.canvas.height);

		createjs.Touch.enable(physics.stage);

		// createjs.Ticker.on("tick", tick);
		// createjs.Ticker.setFPS(30);

	    new Body(physics, { type: "static", x: 0, y: physics.stage.canvas.height/scale/2, height: 10/scale,  width: physics.stage.canvas.width/scale , name:"floor" });
	    new Body(physics, { type: "static", x: 0, y: 0, height: physics.stage.canvas.height/scale,  width: 10/scale , name:"left_wall" });

		// var test = new Body(physics, { x: 260/scale, y: 160/scale, shape: "circle", radius: 15/scale, name:"ball" });
		// test.CreateFixture({"density" : 100});

		var b2ball = new Body(physics, { x: 260/scale, y: 160/scale, shape: "circle", radius: 15 / scale, name:"ball" });	// circle of 2.5 * 20 = 50 pixels radius
		b2ball.body.ApplyImpulse(new b2Vec2(Math.cos(0 * (Math.PI / 180)) * 1000,Math.sin(0 * (Math.PI / 180)) * 1000),b2ball.body.GetWorldCenter());

		multiplier = new Multiplier(physics.stage.canvas.width, physics.stage.canvas.height, 10, 20, 30); 
		// PARAMS MULTIPLIER: stageWidth, stageHeight, xOffset, barWidth, maxPercentage 

		cannon = new Cannon(physics.stage.canvas.width, physics.stage.canvas.height, 50, 10);
		// PARAMS CANNON: stageWidth, stageHeight, xOffset, yBottomOffset 

		physics.stage.addChild(multiplier, cannon);

		requestAnimationFrame(gameLoop);
	}

	function mouseMove(event) {
		console.log("Finger, move");

		/** Rotate if angle not set yet **/
		if (cannon.canSetAngle) {
			var fingerLocation = {
				"x": event.stageX,
				"y": event.stageY
			}
			var angle = cannon.calculateShootingAngleWithPoint(fingerLocation);
			cannon.rotateShooter(angle, -80, -10);
		};
	}

	function stageMouseUp(event) {

		/** Start or lock multiplier **/
		cannon.canSetAngle = false;
		if (!multiplier.isStarted) multiplier.start();
		else {
			if (!multiplier.isLocked) {
				/* !!SHOOT VOILJANET HERE!! */
				console.log("SHOOT VOILJANET");
				multiplier.lock();
			}
		}

		console.log("Finger, touch up");
	}

	/** Restart to shoot again **/
	function restart() {

		cannon.canSetAngle = true;
		multiplier.restart();
	}

	/* Box2D */

	Physics.prototype.step = function(dt) {

		// console.log("step");

		this.dtRemaining += dt;

	    while (this.dtRemaining > this.stepAmount) {
	        this.dtRemaining -= this.stepAmount;
	        this.world.Step(this.stepAmount, 8 /*velocity iterations*/, 3 /*position iterations*/);
	    }

		if (this.debugDraw) this.world.DrawDebugData();
		else { 
		    var obj = this.world.GetBodyList();
		    while (obj) {
		    	body = obj.GetUserData();
		        if (body) body.draw(this.context);
		        obj = obj.GetNext();
		    }
		    physics.stage.update();
		}
	};

	Body.prototype.draw = function(context) {

		// console.log("draw");
	};

	var lastFrame = new Date().getTime();
	
	window.gameLoop = function() {

	    var time = new Date().getTime();

	    var dt = (time - lastFrame) / 1000;
	    if(dt > 1/15) dt = 1/15;

	    requestAnimationFrame(gameLoop);
	    physics.step(dt);

	    lastFrame = time;
	};

	/* End of Box2D */

	var app = {

	    initialize: function() {
	        
	        this.bindEvents();

	        // init();

	        console.log("game.js");
	    },

	    bindEvents: function() {
	        document.addEventListener('deviceready', this.onDeviceReady, false);
	    },

	    onDeviceReady: function() {
	        app.receivedEvent('deviceready');
	        console.log("Device is ready!");
	        init();
	    },

	    receivedEvent: function(id) {
	    }
	};

	app.initialize();
	
	init();

}());