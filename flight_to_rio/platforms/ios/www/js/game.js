/*
* 
* 	game.js
* 
* 	Created by Dries Van Schevensteen on 23/02/15.
*
*/

(function() {

	var physics, multiplier, cannon, hud, scale, voilJanet, b2voilJanet, angle, frameNeedsToMove, gameOver, gameOverTxt, trampolines, restartBtn;

	function init() {

		var canvas = document.getElementById("gameCanvas");
		canvas.width = $(window).width();
		canvas.height = $(window).height();

	    physics = window.physics = new Physics(canvas);
		
		// physics.debug();

		scale = physics.scale;
		// console.log("Scale: " + scale);

	 	physics.stage = new createjs.Stage(canvas);

	 	physics.stage.on("stagemousemove", mouseMove);
		physics.stage.on("stagemouseup", stageMouseUp);

		// console.log("Width: " + physics.stage.canvas.width  + " Height: " + physics.stage.canvas.height);

		createjs.Touch.enable(physics.stage);

	    new Body(physics, { type: "static", x: canvas.width/2/scale, y: canvas.height/scale, height: 10/scale,  width: canvas.width*10 , name:"floor" });
	    	/** Cranked up width to prevent voilJanet hitting no ground on an large throw **/
	    new Body(physics, { type: "static", x: 0, y: canvas.height/2/scale, height: canvas.height/scale,  width: 10/scale , name:"left_wall" });

		multiplier = new Multiplier(physics.stage.canvas.width, physics.stage.canvas.height, 10, 20, 40); 
			// PARAMS MULTIPLIER: stageWidth, stageHeight, xOffset, barWidth, maxPercentage 

		cannon = new Cannon(physics.stage.canvas.width, physics.stage.canvas.height, 50, 10);
			// PARAMS CANNON: stageWidth, stageHeight, xOffset, yBottomOffset 

		hud = new Hud(physics.stage.canvas.width, physics.stage.canvas.height);

		physics.stage.addChild(multiplier, cannon, hud);

		multiplier.start();

		requestAnimationFrame(gameLoop);

		frameNeedsToMove = false;
		gameOver = false;

		trampolines = new Array();
	}

	function mouseMove(event) {

		// console.log("Finger, move");

		/** Rotate if angle not set yet **/
		if (cannon.canSetAngle) {
			var fingerLocation = {
				"x": event.stageX,
				"y": event.stageY
			}
			angle = cannon.calculateShootingAngleWithPoint(fingerLocation, -80, -10);
			cannon.rotateShooter(angle, -80, -10);
		};
	}

	function stageMouseUp(event) {

		// console.log("Finger, touch up");

		/** Start or lock multiplier **/
		if (!multiplier.isLocked) {
			
			multiplier.lock();
			cannon.canSetAngle = false;

			var location = cannon.getLocationToShootFrom();

			voilJanet = new VoilJanet(location);

			physics.stage.addChild(voilJanet);

			b2voilJanet = new Body(physics, { x: location.x/scale, y: location.y/scale, shape: "block", name:"ball" , width: 8, height: 3 });				
			
			/** Multiplies current height of powerbar with param **/
			var Shootingpower = multiplier.ReturnPowerLevel(30); 
			// console.log("Shootingpower: " + Shootingpower);
			
			b2voilJanet.body.ApplyImpulse( new b2Vec2(	Math.cos(angle * (Math.PI / 180)) * Shootingpower,
														Math.sin(angle * (Math.PI / 180)) * Shootingpower),
														b2voilJanet.body.GetWorldCenter() );

			b2voilJanet.fixtureDef.density = .4;
			b2voilJanet.fixtureDef.resitution = .05;

			console.log(b2voilJanet);
		}
		
		if (gameOver) restart(); 
	}

	/** Restart to shoot again **/
	function restart() {

		cannon.canSetAngle = true;
		
		multiplier.restart();
		multiplier.start();

		physics.stage.x = 0;

		hud.restart();

		physics.stage.removeChild(voilJanet);
		voilJanet = undefined;
		b2voilJanet = undefined;

		frameNeedsToMove = false;
		gameOver = false;

		prevX = 0;

		trampolines = [];

		physics.stage.removeChild(restartBtn);
		restartBtn = undefined;

		hud.score.text = "Score: 0";
	}

	/* Box2D */

	Physics.prototype.step = function(dt) {

		// console.log("Physics, step");

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

	var prevX = 0;

	Body.prototype.draw = function(context) {

		// console.log("Physics, draw");

		if (voilJanet) {
			voilJanet.player.x = b2voilJanet.body.m_xf.position.x*scale;
			voilJanet.player.y = b2voilJanet.body.m_xf.position.y*scale;

			currentX = voilJanet.player.x;

			if (frameNeedsToMove || shouldFrameMove(voilJanet.player.x, 40)) {
				frameNeedsToMove = true;
				// console.log("Frame should move");
				// console.log(voilJanet.player.x, physics.stage.x);

				var widthToSubtractFromCurrentStage = (currentX - prevX);
				// console.log(widthToSubtractFromCurrentStage);

				if (prevX !== 0) {
					physics.stage.x -= widthToSubtractFromCurrentStage;
					hud.bg.x += widthToSubtractFromCurrentStage;
					hud.score.x += widthToSubtractFromCurrentStage;

					if (restartBtn) restartBtn.x += widthToSubtractFromCurrentStage;
				}

				prevX = voilJanet.player.x;

				/** Adds trampoline only if stage is moving **/
				if (Math.floor((Math.random() * 500) + 1) == 1) {
					console.log("Add trampoline");

					var trampoline = new Trampoline(physics.stage.canvas.width + Math.abs(physics.stage.x), physics.stage.canvas.height);
					trampolines.add = trampoline;
					physics.stage.addChild(trampoline);
				};
			}

			var currentScore = Math.round(voilJanet.player.x/10);

			if (didHitground() && !gameOver) {
				console.log("GAME OVER");
				
				gameOver = true;

				restartBtn = new createjs.Text("Game over!\n\nScore: " + currentScore + "\n\nTab anywhere to restart", "20px HelveticaNeue", "black");
				restartBtn.textAlign = "center";
				restartBtn.lineWidth = 400;
				restartBtn.x = physics.stage.canvas.width/2 + Math.abs(physics.stage.x);
				console.log(restartBtn.width);
				restartBtn.y = physics.stage.canvas.height/2 - restartBtn.getBounds().height/2;
				physics.stage.addChild(restartBtn);

				console.log(physics.stage.canvas.width, Math.abs(physics.stage.x));

				hud.score.text = "Score: " + currentScore;
			}

			if (!gameOver) hud.score.text = "Score: " + currentScore;
		}
	};

	var shouldFrameMove = function(x, startMovingFromLeftOnXAxisInPercentage) {
		return (physics.stage.canvas.width / 100 * startMovingFromLeftOnXAxisInPercentage) <= x;
	}

	var didHitground = function() {
		return (physics.stage.canvas.height - voilJanet.player.y) <= 25;
	}

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