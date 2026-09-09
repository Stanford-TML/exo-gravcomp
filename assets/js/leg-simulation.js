/**
 * Interactive Biomechanical Leg & Center of Rotation Simulation
 * Visualizes Soft Tissue Artifact (STA), shifting instantaneous center of rotation,
 * and viscoelastic interface forces under exoskeleton cable tension.
 */

(function() {
  function initLegSimulation() {
    const canvas = document.getElementById("legSimCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions
    const thighLength = 300;
    const shinLength = 220;
    const shankTubeHeight = 120;
    const baseRotationDeg = -40;

    // Animation timing
    let startTime = performance.now();
    const LOOP_DURATION = 3200; // 3.2s smooth cycle
    let isPaused = false;
    let pausedAt = 0;
    let animFrameId = null;

    // Telemetry DOM elements (if present)
    const driftTelemetry = document.getElementById("sta-drift-value");
    const angleTelemetry = document.getElementById("sta-angle-value");
    const simPlayPauseBtn = document.getElementById("sim-playpause-btn");
    const simPlayPauseIcon = document.getElementById("sim-playpause-icon");

    function getSceneState(timeMs) {
      const progress = (timeMs % LOOP_DURATION) / LOOP_DURATION;
      const angleOffset = Math.sin(progress * Math.PI * 2);
      
      const kneeAngle = 85 + 18 * angleOffset; 
      
      // Deformation phase: Tension peaks when the leg extends
      const deformPhase = -angleOffset; 
      const deform = deformPhase > 0 ? deformPhase : 0; 
      
      return { kneeAngle, deform };
    }

    function animate() {
      if (!isPaused) {
        const timeMs = performance.now() - startTime;
        const { kneeAngle, deform } = getSceneState(timeMs);

        drawScene(ctx, kneeAngle, deform);

        // Update telemetry
        const hKneeX = deform * 7; 
        const hKneeY = deform * 4; 
        const driftDist = Math.sqrt(hKneeX * hKneeX + hKneeY * hKneeY);
        // Calibrate roughly to ~18 mm fluoroscopic STA reported in paper
        const driftMm = (driftDist * 2.2).toFixed(1);

        if (driftTelemetry) {
          driftTelemetry.textContent = `${driftMm} mm`;
        }
        if (angleTelemetry) {
          angleTelemetry.textContent = `${kneeAngle.toFixed(0)}°`;
        }
      }
      animFrameId = requestAnimationFrame(animate);
    }

    function drawRoundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
      } else {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
      }
    }

    function drawScene(currentCtx, kneeAngleDegrees, deform) {
      const width = currentCtx.canvas.width;
      const height = currentCtx.canvas.height;
      currentCtx.clearRect(0, 0, width, height);

      const baseAngleRad = baseRotationDeg * Math.PI / 180;
      const kneeAngleRad = kneeAngleDegrees * Math.PI / 180;
      const exoThighAngleRad = deform * 0.08;

      // ==========================================
      // 1. LEFT PANEL: Full Leg Macro Kinematics
      // ==========================================
      const leftW = 290;
      const leftH = height - 24;
      const leftX = 12;
      const leftY = 12;

      currentCtx.save();
      // Background card
      currentCtx.fillStyle = '#f8fafc';
      currentCtx.strokeStyle = '#e2e8f0';
      currentCtx.lineWidth = 1;
      drawRoundRect(currentCtx, leftX, leftY, leftW, leftH, 12);
      currentCtx.fill();
      currentCtx.stroke();

      currentCtx.restore();

      // Draw full leg
      const leftPivotX = leftX + leftW * 0.50;
      const leftPivotY = leftY + leftH * 0.50;
      const leftScale = 0.52;

      currentCtx.save();
      currentCtx.translate(leftPivotX, leftPivotY);
      currentCtx.scale(leftScale, leftScale);
      currentCtx.rotate(baseAngleRad);

      drawLeg(currentCtx, thighLength, shinLength, kneeAngleRad, deform);
      drawTubes(currentCtx, thighLength, shinLength, shankTubeHeight, kneeAngleRad, exoThighAngleRad);
      drawStraps(currentCtx, thighLength, shinLength, kneeAngleRad, exoThighAngleRad, deform);
      drawRopeAndForces(currentCtx, thighLength, shankTubeHeight, kneeAngleRad, exoThighAngleRad, deform);
      drawCapsAndJoints(currentCtx, thighLength, shinLength, shankTubeHeight, kneeAngleRad, exoThighAngleRad);
      currentCtx.restore();

      // Red magnifying reticle on left knee
      const reticleR = 24;
      currentCtx.save();
      currentCtx.beginPath();
      currentCtx.arc(leftPivotX, leftPivotY, reticleR, 0, Math.PI * 2);
      currentCtx.fillStyle = 'rgba(140, 21, 21, 0.08)';
      currentCtx.fill();
      currentCtx.strokeStyle = '#8C1515';
      currentCtx.lineWidth = 1.8;
      currentCtx.stroke();

      // Reticle center point
      currentCtx.fillStyle = '#8C1515';
      currentCtx.beginPath();
      currentCtx.arc(leftPivotX, leftPivotY, 2.5, 0, Math.PI * 2);
      currentCtx.fill();
      currentCtx.restore();

      // ==========================================
      // 2. GUIDE PROJECTION RAYS
      // ==========================================
      const rightX = 336;
      const rightY = 12;
      const rightW = width - rightX - 12;
      const rightH = height - 24;

      currentCtx.save();
      // Conical projection wash
      currentCtx.beginPath();
      currentCtx.moveTo(leftPivotX + reticleR * 0.9, leftPivotY - reticleR * 0.4);
      currentCtx.lineTo(rightX, rightY + 12);
      currentCtx.lineTo(rightX, rightY + rightH - 12);
      currentCtx.lineTo(leftPivotX + reticleR * 0.9, leftPivotY + reticleR * 0.4);
      currentCtx.closePath();
      currentCtx.fillStyle = 'rgba(140, 21, 21, 0.03)';
      currentCtx.fill();

      // Dashed projection rays
      currentCtx.strokeStyle = 'rgba(140, 21, 21, 0.35)';
      currentCtx.lineWidth = 1.2;
      currentCtx.setLineDash([4, 4]);

      currentCtx.beginPath();
      currentCtx.moveTo(leftPivotX + reticleR * 0.9, leftPivotY - reticleR * 0.4);
      currentCtx.lineTo(rightX, rightY + 12);
      currentCtx.stroke();

      currentCtx.beginPath();
      currentCtx.moveTo(leftPivotX + reticleR * 0.9, leftPivotY + reticleR * 0.4);
      currentCtx.lineTo(rightX, rightY + rightH - 12);
      currentCtx.stroke();
      currentCtx.setLineDash([]);
      currentCtx.restore();

      // ==========================================
      // 3. RIGHT PANEL: Magnified Region of Interest
      // ==========================================
      currentCtx.save();
      // Panel card background
      currentCtx.fillStyle = '#ffffff';
      currentCtx.strokeStyle = '#e2e8f0';
      currentCtx.lineWidth = 1.5;
      drawRoundRect(currentCtx, rightX, rightY, rightW, rightH, 12);
      currentCtx.fill();
      currentCtx.stroke();

      // Clip magnified contents to inside the panel
      currentCtx.save();
      drawRoundRect(currentCtx, rightX + 1, rightY + 1, rightW - 2, rightH - 2, 11);
      currentCtx.clip();

      const rightPivotX = rightX + rightW * 0.44;
      const rightPivotY = rightY + rightH * 0.50;
      const rightScale = 1.24; // 1.24 / 0.52 = 2.38x magnification

      currentCtx.translate(rightPivotX, rightPivotY);
      currentCtx.scale(rightScale, rightScale);
      currentCtx.rotate(baseAngleRad);

      drawLeg(currentCtx, thighLength, shinLength, kneeAngleRad, deform);
      drawTubes(currentCtx, thighLength, shinLength, shankTubeHeight, kneeAngleRad, exoThighAngleRad);
      drawStraps(currentCtx, thighLength, shinLength, kneeAngleRad, exoThighAngleRad, deform);
      drawRopeAndForces(currentCtx, thighLength, shankTubeHeight, kneeAngleRad, exoThighAngleRad, deform);
      drawCapsAndJoints(currentCtx, thighLength, shinLength, shankTubeHeight, kneeAngleRad, exoThighAngleRad);
      drawDynamicForces(currentCtx, thighLength, shinLength, kneeAngleRad, exoThighAngleRad, deform);
      drawDriftIndicator(currentCtx, deform);

      currentCtx.restore(); // end clip
      currentCtx.restore(); // end right panel
    }

    // --- DRAWING FUNCTIONS ---
    function drawLeg(currentCtx, thighL, shinL, kneeAngleRad, deform) {
      currentCtx.save();
      currentCtx.strokeStyle = '#2563eb'; // blue-600
      currentCtx.lineWidth = 2.5;
      currentCtx.fillStyle = 'rgba(37, 99, 235, 0.07)';

      // Flesh center of rotation shift
      const hKneeX = deform * 7; 
      const hKneeY = deform * 4; 

      const sin = Math.sin(kneeAngleRad);
      const cos = Math.cos(kneeAngleRad);
      const t = (x, y) => ({
        x: hKneeX + x * cos - y * sin,
        y: hKneeY + x * sin + y * cos
      });

      const squishFront = deform * 24;
      const squishBack = deform * 25;
      const squishCalf = deform * 18;

      currentCtx.beginPath();
      
      // 1. Hip Front
      currentCtx.moveTo(hKneeX + 60, hKneeY - thighL * 0.9);

      // 2. Thigh Front (Quad) squishing inwards
      currentCtx.bezierCurveTo(
        hKneeX + 90 - squishFront, hKneeY - thighL * 0.6, 
        hKneeX + 45 - squishFront * 0.4, hKneeY - thighL * 0.2, 
        hKneeX + 38, hKneeY + 5
      );

      // 3. Knee Cap to Shin Front
      const shinFrontTop = t(38, 15);
      const ankleFront = t(25, shinL - 10);
      currentCtx.quadraticCurveTo(hKneeX + 45, hKneeY + 25, shinFrontTop.x, shinFrontTop.y);
      currentCtx.lineTo(ankleFront.x, ankleFront.y);

      // 4. Foot Instep
      const instep = t(50, shinL + 5);
      const toeTop = t(90, shinL + 25);
      currentCtx.bezierCurveTo(t(35, shinL - 5).x, t(35, shinL - 5).y, instep.x, instep.y, toeTop.x, toeTop.y);
      
      // 5. Toe Tip
      const toeTip = t(95, shinL + 45);
      currentCtx.quadraticCurveTo(t(100, shinL + 35).x, t(100, shinL + 35).y, toeTip.x, toeTip.y);
      
      // 6. Ball of foot to Arch
      const ball = t(60, shinL + 60);
      const arch = t(20, shinL + 50);
      currentCtx.bezierCurveTo(t(80, shinL + 55).x, t(80, shinL + 55).y, ball.x, ball.y, arch.x, arch.y);

      // 7. Rounded Heel Bottom to Heel Back
      const heelBottom = t(-25, shinL + 55);
      const heelBack = t(-45, shinL + 30);
      currentCtx.bezierCurveTo(t(5, shinL + 45).x, t(5, shinL + 45).y, t(-10, shinL + 55).x, t(-10, shinL + 55).y, heelBottom.x, heelBottom.y);
      currentCtx.quadraticCurveTo(t(-40, shinL + 55).x, t(-40, shinL + 55).y, heelBack.x, heelBack.y);

      // 8. Heel to Ankle Back
      const ankleBack = t(-20, shinL - 25);
      currentCtx.quadraticCurveTo(t(-45, shinL + 5).x, t(-45, shinL + 5).y, ankleBack.x, ankleBack.y);

      // 9. Calf (Shin Back) squishing inwards
      const calfMid = t(-90 + squishCalf, shinL * 0.35);
      const crease = { x: hKneeX - 35 + deform * 5, y: hKneeY - 35 }; 
      currentCtx.bezierCurveTo(ankleBack.x, ankleBack.y, calfMid.x, calfMid.y, crease.x, crease.y);

      // 10. Thigh Back (Hamstring) squishing inwards
      currentCtx.bezierCurveTo(
        crease.x - 5, crease.y - 20,
        hKneeX - 105 + squishBack * 0.8, hKneeY - thighL * 0.6,
        hKneeX - 60, hKneeY - thighL * 0.9
      );
      
      // 11. Close outline at Hip
      currentCtx.quadraticCurveTo(hKneeX, hKneeY - thighL * 1.05, hKneeX + 60, hKneeY - thighL * 0.9);

      currentCtx.fill();
      currentCtx.stroke();
      currentCtx.restore();
    }

    function drawTubes(currentCtx, thighL, shinL, shinUpperL, kneeAngleRad, exoThighAngleRad) {
      const tubeWidth = 24;
      const tubeColor = '#0f172a'; // slate-900

      currentCtx.save();
      currentCtx.rotate(exoThighAngleRad);
      currentCtx.fillStyle = tubeColor;
      currentCtx.fillRect(-tubeWidth / 2, -thighL, tubeWidth, thighL);
      currentCtx.restore();

      currentCtx.save();
      currentCtx.rotate(kneeAngleRad);
      currentCtx.fillStyle = tubeColor;
      currentCtx.fillRect(-tubeWidth / 2, 0, tubeWidth, shinL);
      currentCtx.fillRect(-tubeWidth / 2, -shinUpperL, tubeWidth, shinUpperL);
      currentCtx.restore();
    }

    function drawStraps(currentCtx, thighL, shinL, kneeAngleRad, exoThighAngleRad, deform) {
      currentCtx.save();
      currentCtx.strokeStyle = '#64748b'; // slate-500
      currentCtx.lineWidth = 3;

      const getThighPt = (x, y) => ({
        x: x * Math.cos(exoThighAngleRad) - y * Math.sin(exoThighAngleRad),
        y: x * Math.sin(exoThighAngleRad) + y * Math.cos(exoThighAngleRad)
      });
      const getShinPt = (x, y) => ({
        x: x * Math.cos(kneeAngleRad) - y * Math.sin(kneeAngleRad),
        y: x * Math.sin(kneeAngleRad) + y * Math.cos(kneeAngleRad)
      });

      const hKneeX = deform * 7; 
      const hKneeY = deform * 4; 
      const t = (x, y) => ({
        x: hKneeX + x * Math.cos(kneeAngleRad) - y * Math.sin(kneeAngleRad),
        y: hKneeY + x * Math.sin(kneeAngleRad) + y * Math.cos(kneeAngleRad)
      });

      const squishFront = deform * 24;
      const squishBack = deform * 22;
      const squishCalf = deform * 25;

      const drawCurve = (p1, p2, curveOffset) => {
        currentCtx.beginPath();
        currentCtx.moveTo(p1.x, p1.y);
        currentCtx.quadraticCurveTo((p1.x+p2.x)/2 + curveOffset.x, (p1.y+p2.y)/2 + curveOffset.y, p2.x, p2.y);
        currentCtx.stroke();
      };

      // 1. Top Thigh Strap
      let t1 = getThighPt(12, -thighL * 0.2);
      let f1 = { x: hKneeX + 62 - squishFront * 0.65, y: hKneeY - thighL * 0.4 };
      drawCurve(t1, f1, {x: 0, y: 15});

      // 2. Bottom Thigh Strap
      let t2 = getThighPt(-12, -thighL * 0.7);
      let f2 = { x: hKneeX - 70 + squishBack * 0.4, y: hKneeY - thighL * 0.5 };
      drawCurve(t2, f2, {x: -10, y: -5});

      // 3. Top Shin Strap (Front)
      let t3 = getShinPt(12, shinL * 0.25);
      let f3 = t(35, shinL * 0.4);
      drawCurve(t3, f3, {x: 5, y: -5});

      // 4. Bottom Shin Strap (Back Calf)
      let t4 = getShinPt(-12, shinL * 0.75);
      let f4 = t(-54 + squishCalf * 0.4, shinL * 0.5);
      drawCurve(t4, f4, {x: -5, y: -5});

      currentCtx.restore();
    }

    function drawCapsAndJoints(currentCtx, thighL, shinL, shinUpperL, kneeAngleRad, exoThighAngleRad) {
      const jointSize = 36;
      const motorSize = 70;
      const jointColor = '#ffffff';

      currentCtx.strokeStyle = '#0f172a';
      currentCtx.lineWidth = 2;

      // --- Thigh Mounted Components ---
      currentCtx.save();
      currentCtx.rotate(exoThighAngleRad);
      
      currentCtx.fillStyle = jointColor;
      currentCtx.strokeRect(-motorSize / 2, -thighL - motorSize/2, motorSize, motorSize);
      currentCtx.fillRect(-motorSize / 2, -thighL - motorSize/2, motorSize, motorSize);
      
      currentCtx.fillStyle = '#94a3b8';
      currentCtx.fillRect(12, -thighL + motorSize/2, 16, 20);
      currentCtx.strokeRect(12, -thighL + motorSize/2, 16, 20);

      // Winch Spool
      currentCtx.save();
      currentCtx.translate(0, -thighL);
      currentCtx.rotate(-kneeAngleRad * 4); 
      currentCtx.fillStyle = '#f59e0b'; // amber spool
      currentCtx.beginPath();
      currentCtx.arc(0, 0, 20, 0, 2 * Math.PI);
      currentCtx.fill();
      currentCtx.stroke();
      currentCtx.fillStyle = '#0f172a';
      currentCtx.beginPath();
      currentCtx.arc(12, 0, 4, 0, 2 * Math.PI);
      currentCtx.fill();
      currentCtx.restore();
      
      currentCtx.restore();

      // --- Shin Mounted Components ---
      currentCtx.save();
      currentCtx.rotate(kneeAngleRad);
      
      currentCtx.fillStyle = jointColor;

      // Ankle block
      currentCtx.strokeRect(-jointSize / 2, shinL, jointSize, jointSize);
      currentCtx.fillRect(-jointSize / 2, shinL, jointSize, jointSize);

      // Shin upper cap
      currentCtx.beginPath();
      currentCtx.moveTo(-jointSize / 2 + 4, -shinUpperL);
      currentCtx.lineTo(-jointSize / 2 + 4, -shinUpperL - 35);
      currentCtx.lineTo(jointSize / 2 - 4, -shinUpperL - 20);
      currentCtx.lineTo(jointSize / 2 - 4, -shinUpperL);
      currentCtx.closePath();
      currentCtx.fill();
      currentCtx.stroke();
      
      // Center Exoskeleton Joint Hinge 
      currentCtx.fillStyle = jointColor;
      currentCtx.fillRect(-jointSize / 2, -jointSize / 2, jointSize, jointSize);
      currentCtx.strokeRect(-jointSize / 2, -jointSize / 2, jointSize, jointSize);
      
      // Exoskeleton Hinge Dot (Black)
      currentCtx.fillStyle = '#0f172a';
      currentCtx.beginPath();
      currentCtx.arc(0, 0, 5, 0, 2 * Math.PI);
      currentCtx.fill();

      currentCtx.restore();
    }

    function drawRopeAndForces(currentCtx, thighL, tubeH, kneeAngleRad, exoThighAngleRad, deform) {
      const getThighPt = (x, y) => ({
        x: x * Math.cos(exoThighAngleRad) - y * Math.sin(exoThighAngleRad),
        y: x * Math.sin(exoThighAngleRad) + y * Math.cos(exoThighAngleRad)
      });
      const getShinPt = (x, y) => ({
        x: x * Math.cos(kneeAngleRad) - y * Math.sin(kneeAngleRad),
        y: x * Math.sin(kneeAngleRad) + y * Math.cos(kneeAngleRad)
      });

      const rTop1 = getThighPt(-4, -thighL * 0.5 - 15);
      const rBot1 = getThighPt(-4, -thighL * 0.5 + 15);
      
      const rTop2 = getThighPt(10, -thighL * 0.5 - 15);
      const rBot2 = getThighPt(10, -thighL * 0.5 + 15);
      
      const shinTip1 = getShinPt(-10, -tubeH - 5);
      const shinTip2 = getShinPt(-10, -tubeH - 20);

      const dashOffset = -kneeAngleRad * 80;

      currentCtx.strokeStyle = '#dc2626'; // red-600
      currentCtx.lineWidth = 2.5;
      
      // Rope 1
      currentCtx.setLineDash([8, 4]);
      currentCtx.lineDashOffset = dashOffset;
      currentCtx.beginPath();
      currentCtx.moveTo(getThighPt(-4, -thighL).x, getThighPt(-4, -thighL).y);
      currentCtx.lineTo(rTop1.x, rTop1.y);
      currentCtx.lineTo(rBot1.x, rBot1.y);
      currentCtx.lineTo(shinTip1.x, shinTip1.y);
      currentCtx.stroke();

      // Rope 2
      currentCtx.lineDashOffset = -dashOffset * 0.2;
      currentCtx.beginPath();
      currentCtx.moveTo(getThighPt(20, -thighL + 45).x, getThighPt(20, -thighL + 45).y);
      currentCtx.lineTo(rTop2.x, rTop2.y);
      currentCtx.lineTo(rBot2.x, rBot2.y);
      currentCtx.lineTo(shinTip2.x, shinTip2.y);
      currentCtx.stroke();
      
      currentCtx.setLineDash([]); 

      // Redirect Box
      currentCtx.save();
      currentCtx.rotate(exoThighAngleRad);
      currentCtx.fillStyle = '#ffffff';
      currentCtx.strokeStyle = '#0f172a';
      currentCtx.lineWidth = 2;
      currentCtx.fillRect(-12, -thighL * 0.5 - 15, 24, 30);
      currentCtx.strokeRect(-12, -thighL * 0.5 - 15, 24, 30);
      currentCtx.restore();
    }

    function drawDynamicForces(currentCtx, thighL, shinL, kneeAngleRad, exoThighAngleRad, deform) {
      if (deform < 0.05) return;
      
      currentCtx.save();
      const alpha = Math.min(1, deform * 2);
      const red = `rgba(220, 38, 38, ${alpha})`;
      
      const hKneeX = deform * 7; 
      const hKneeY = deform * 4; 
      const squishFront = deform * 24;
      const squishBack = deform * 22;
      const squishCalf = deform * 18;
      
      const t = (x, y) => ({
        x: hKneeX + x * Math.cos(kneeAngleRad) - y * Math.sin(kneeAngleRad),
        y: hKneeY + x * Math.sin(kneeAngleRad) + y * Math.cos(kneeAngleRad)
      });

      // 1. Upper Thigh Front 
      let f1 = { x: hKneeX + 86 - squishFront, y: hKneeY - thighL * 0.4 };
      drawStraightArrow(currentCtx, f1.x + 50, f1.y - 35, f1.x + 15, f1.y - 15, red);

      // 2. Lower Thigh Back 
      let f2 = { x: hKneeX - 58 + squishBack * 0.8, y: hKneeY - thighL * 0.6 };
      drawStraightArrow(currentCtx, f2.x - 80, f2.y + 25, f2.x - 25, f2.y + 25, red);

      // 3. Lower Shin Back
      let f4 = t(-53 + squishCalf, shinL * 0.65);
      let sx = Math.sin(-kneeAngleRad);
      let sy = Math.cos(-kneeAngleRad);
      drawStraightArrow(currentCtx, f4.x - sy * 40 + sx * 15, f4.y + sx * 40 + sy * 15, f4.x - sy * 5, f4.y + sx * 5, red);

      // Label
      currentCtx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
      currentCtx.font = "bold 11px 'Inter', sans-serif";
      currentCtx.textAlign = "center";
      currentCtx.save();
      currentCtx.translate(f4.x - sy * 48 - sx * 8, f4.y + sx * 48 - sy * 8);
      currentCtx.rotate(-baseRotationDeg * Math.PI / 180);
      currentCtx.fillText("Interface Forces", 0, 0);
      currentCtx.restore();

      currentCtx.restore();
    }

    function drawDriftIndicator(currentCtx, deform) {
      const hKneeX = deform * 7; 
      const hKneeY = deform * 4; 
      const driftDist = Math.sqrt(hKneeX * hKneeX + hKneeY * hKneeY);

      if (driftDist < 0.5) return;

      currentCtx.save();

      // 1. Biological Knee Center Marker (Blue dot)
      currentCtx.fillStyle = '#2563eb';
      currentCtx.beginPath();
      currentCtx.arc(hKneeX, hKneeY, 6.5, 0, Math.PI * 2);
      currentCtx.fill();
      currentCtx.strokeStyle = '#ffffff';
      currentCtx.lineWidth = 2;
      currentCtx.stroke();

      // 2. Label callout: Un-rotate to screen space so +X is strictly horizontal to the right
      currentCtx.save();
      currentCtx.translate(hKneeX, hKneeY); // Anchor at anatomical blue center marker
      currentCtx.rotate(-baseRotationDeg * Math.PI / 180); // Un-rotate to horizontal screen coordinates

      // Thin connecting leader line from blue dot to label
      currentCtx.beginPath();
      currentCtx.strokeStyle = 'rgba(185, 28, 28, 0.45)';
      currentCtx.lineWidth = 1.2;
      currentCtx.moveTo(8, 0);
      currentCtx.lineTo(55, 0);
      currentCtx.stroke();

      currentCtx.fillStyle = '#b91c1c';
      currentCtx.font = "bold 12px system-ui, -apple-system, sans-serif";
      currentCtx.textAlign = 'left';
      currentCtx.textBaseline = 'middle';
      currentCtx.fillText("Δ Axis Shift (STA)", 60, 0); // Placed well clear of leg contour to the right
      currentCtx.restore();

      currentCtx.restore();
    }

    function drawStraightArrow(currentCtx, x1, y1, x2, y2, color) {
      currentCtx.strokeStyle = color;
      currentCtx.fillStyle = color;
      currentCtx.lineWidth = 2.5;

      currentCtx.beginPath();
      currentCtx.moveTo(x1, y1);
      currentCtx.lineTo(x2, y2);
      currentCtx.stroke();

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headlen = 10;
      
      currentCtx.beginPath();
      currentCtx.moveTo(x2, y2);
      currentCtx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
      currentCtx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
      currentCtx.closePath();
      currentCtx.fill();
    }

    // Play/Pause button interaction
    if (simPlayPauseBtn) {
      simPlayPauseBtn.addEventListener("click", () => {
        isPaused = !isPaused;
        if (isPaused) {
          pausedAt = performance.now() - startTime;
          if (simPlayPauseIcon) {
            simPlayPauseIcon.setAttribute("data-lucide", "play");
          }
        } else {
          startTime = performance.now() - pausedAt;
          if (simPlayPauseIcon) {
            simPlayPauseIcon.setAttribute("data-lucide", "pause");
          }
        }
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // Start loop
    animate();
  }

  // Hook into DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLegSimulation);
  } else {
    initLegSimulation();
  }
})();
