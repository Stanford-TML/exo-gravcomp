/**
 * CoRL 2026 Project Website Main JavaScript
 * Handles:
 *  - Animated/Interactive LaTeX Derivation Stepper with KaTeX
 *  - Interactive Main Result Chart (Ours vs Analytical Baseline)
 *  - BibTeX copy-to-clipboard
 *  - Smooth navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons if available
  if (window.lucide) {
    window.lucide.createIcons();
  }

  initDerivationStepper();
  initResultsChart();
  initBibtexCopy();
});

/* =========================================================================
   1. Interactive Animated LaTeX Derivation Stepper
   ========================================================================= */
const derivationSteps = [
  {
    step: 1,
    title: "1. Full Coupled Human-Exoskeleton Dynamics",
    latex: String.raw`M(q)\ddot{q} + C(q, \dot{q})\dot{q} + g(q) = \tau_{\text{measured}} + \tau_{\text{active}} + \tau_{\text{passive}}(\theta)`,
    caption: String.raw`In wearable robotics, biological torques consist of voluntary muscle reflexes ($\tau_{\text{active}}$) and non-linear passive joint elasticity ($\tau_{\text{passive}}$). Analytical modeling fails because human soft-tissue deformation and hyperstatic closed loops corrupt rigid-body assumptions.`
  },
  {
    step: 2,
    title: "2. Velocity-Limited Admittance Clamping",
    latex: String.raw`\cancel{M(q)\ddot{q}} + C(q, \dot{q}_{\text{limit}})\dot{q}_{\text{limit}} + g(q) = \tau_{\text{measured}} + \cancel{\tau_{\text{active}}} + \tau_{\text{passive}}(\theta)`,
    caption: String.raw`By enforcing a strict velocity ceiling ($\dot{q}_{\text{limit}} = 0.125\text{ rad/s}$) during passive yielding, acceleration drops to zero ($\ddot{q} = 0$), physically eliminating inertial transients and suppressing user stretch reflexes ($\tau_{\text{active}} \to 0$).`
  },
  {
    step: 3,
    title: "3. Pushing Coriolis into the Noise Floor",
    latex: String.raw`\cancel{C(q, \dot{q}_{\text{limit}})\dot{q}_{\text{limit}}} + g(q) \approx \tau_{\text{measured}} + \tau_{\text{passive}}(\theta)`,
    caption: String.raw`Because Coriolis torques scale quadratically with velocity ($\propto \dot{q}^2$), at 0.125 rad/s they reduce to roughly 0.015 Nm—vanishing deep below the sensor noise floor (~0.2 Nm) to isolate a pure quasi-static torque landscape.`
  },
  {
    step: 4,
    title: "4. Clean Empirical Assistance Labels",
    latex: String.raw`\tau_{\text{measured}} \approx g(q) - \tau_{\text{passive}}(\theta) \implies F_{\text{winch}} \approx \frac{g(q) - \tau_{\text{passive}}(\theta)}{R(q)}`,
    caption: String.raw`The motor winch tension $F_{\text{winch}}$ directly measures the exact required feedforward assistance! Bypassing analytical modeling, the exoskeleton acts as its own measurement instrument to generate unpolluted training labels.`
  }
];

let currentStepIdx = 0;
let autoAdvanceTimer = null;
let isPlaying = true;
const STEP_DURATION = 5000; // 5 seconds per step

function initDerivationStepper() {
  const latexContainer = document.getElementById('derivation-latex');
  const titleContainer = document.getElementById('derivation-title');
  const captionContainer = document.getElementById('derivation-caption');
  const pillsContainer = document.getElementById('derivation-pills');
  const prevBtn = document.getElementById('derivation-prev');
  const nextBtn = document.getElementById('derivation-next');
  const playPauseBtn = document.getElementById('derivation-playpause');
  const playPauseIcon = document.getElementById('playpause-icon');

  if (!latexContainer) return;

  // Render pills
  pillsContainer.innerHTML = derivationSteps.map((step, idx) => `
    <button class="step-pill px-3 py-1 text-xs font-semibold rounded-full transition-all ${
      idx === 0 
        ? 'bg-red-800 text-white shadow-sm' 
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }" data-step="${idx}">
      Step ${step.step}
    </button>
  `).join('');

  const pillButtons = pillsContainer.querySelectorAll('.step-pill');

  function renderStep(index, animate = true) {
    currentStepIdx = (index + derivationSteps.length) % derivationSteps.length;
    const stepData = derivationSteps[currentStepIdx];

    // Update title
    titleContainer.textContent = stepData.title;

    // Render KaTeX for equation
    if (window.katex) {
      try {
        window.katex.render(stepData.latex, latexContainer, {
          displayMode: true,
          throwOnError: false
        });
      } catch (e) {
        latexContainer.textContent = stepData.latex;
      }
    } else {
      latexContainer.textContent = stepData.latex;
    }

    // Render caption with inline math
    renderInlineMath(captionContainer, stepData.caption);

    // Add animation
    if (animate) {
      latexContainer.classList.remove('step-fade');
      void latexContainer.offsetWidth; // trigger reflow
      latexContainer.classList.add('step-fade');
    }

    // Update pill buttons active state
    pillButtons.forEach((pill, idx) => {
      if (idx === currentStepIdx) {
        pill.className = 'step-pill px-3 py-1 text-xs font-semibold rounded-full transition-all bg-[#8C1515] text-white shadow-sm';
      } else {
        pill.className = 'step-pill px-3 py-1 text-xs font-semibold rounded-full transition-all bg-slate-100 text-slate-600 hover:bg-slate-200';
      }
    });
  }

  function renderInlineMath(element, text) {
    // Robust inline math splitter for $...$ and \(...\)
    const parts = text.split(/(\$.*?\$|\\\(.*?\\\))/g);
    element.innerHTML = '';
    parts.forEach(part => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        const span = document.createElement('span');
        span.className = 'inline-math px-0.5 text-slate-900 font-medium';
        if (window.katex) {
          try {
            window.katex.render(math, span, { displayMode: false, throwOnError: false });
          } catch (e) {
            span.textContent = math;
          }
        } else {
          span.textContent = math;
        }
        element.appendChild(span);
      } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
        const math = part.slice(2, -2);
        const span = document.createElement('span');
        span.className = 'inline-math px-0.5 text-slate-900 font-medium';
        if (window.katex) {
          try {
            window.katex.render(math, span, { displayMode: false, throwOnError: false });
          } catch (e) {
            span.textContent = math;
          }
        } else {
          span.textContent = math;
        }
        element.appendChild(span);
      } else if (part) {
        element.appendChild(document.createTextNode(part));
      }
    });
  }

  function startAutoAdvance() {
    stopAutoAdvance();
    autoAdvanceTimer = setInterval(() => {
      renderStep(currentStepIdx + 1);
    }, STEP_DURATION);
    isPlaying = true;
    if (playPauseIcon) {
      playPauseIcon.setAttribute('data-lucide', 'pause');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function stopAutoAdvance() {
    if (autoAdvanceTimer) {
      clearInterval(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    isPlaying = false;
    if (playPauseIcon) {
      playPauseIcon.setAttribute('data-lucide', 'play');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Pill click handlers
  pillButtons.forEach((pill, idx) => {
    pill.addEventListener('click', () => {
      stopAutoAdvance();
      renderStep(idx);
    });
  });

  // Prev / Next click handlers
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      stopAutoAdvance();
      renderStep(currentStepIdx - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      stopAutoAdvance();
      renderStep(currentStepIdx + 1);
    });
  }

  // Play/Pause button
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      if (isPlaying) {
        stopAutoAdvance();
      } else {
        renderStep(currentStepIdx + 1);
        startAutoAdvance();
      }
    });
  }

  // Initial render & start
  renderStep(0, false);
  startAutoAdvance();
}

/* =========================================================================
   2. Pithy Results Showcase Chart (Ours vs Analytical Baseline)
   ========================================================================= */
function initResultsChart() {
  const ctx = document.getElementById('mainResultsChart');
  if (!ctx || !window.Chart) return;

  const tasks = ['Stand', 'Shallow Squat', 'Deep Squat', 'Sit-to-Hold', 'Asymmetric Lunge', 'Pistol Squat'];
  
  // Normalized Torque Error MAE (Nm/kg) from Table 1 in paper
  const mujocoErrors = [0.29, 0.17, 0.15, 0.12, 0.68, 0.28];
  const ourErrors = [0.08, 0.09, 0.12, 0.15, 0.17, 0.23];

  new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: tasks,
      datasets: [
        {
          label: 'Analytical Physics Baseline (MuJoCo)',
          data: mujocoErrors,
          backgroundColor: 'rgba(148, 163, 184, 0.75)', // slate-400
          borderColor: 'rgba(100, 116, 139, 1)',
          borderWidth: 1.5,
          borderRadius: 6,
          barPercentage: 0.8,
          categoryPercentage: 0.7
        },
        {
          label: 'Ours (Empirical Feedforward Model)',
          data: ourErrors,
          backgroundColor: 'rgba(140, 21, 21, 0.85)', // Stanford Cardinal #8C1515
          borderColor: 'rgba(90, 0, 0, 1)',
          borderWidth: 1.5,
          borderRadius: 6,
          barPercentage: 0.8,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              family: "'Inter', sans-serif",
              size: 13,
              weight: '600'
            },
            color: '#1e293b',
            boxWidth: 16,
            padding: 18
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleFont: { family: "'Inter', sans-serif", size: 13, weight: '700' },
          bodyFont: { family: "'Inter', sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.raw} Nm/kg MAE`;
            },
            afterBody: function(context) {
              if (context[0].label === 'Asymmetric Lunge') {
                return '\n💡 Highlight: Analytical model fails on closed-loop contact (0.68 Nm/kg), while our empirical model remains stable (0.17 Nm/kg) with 4× error reduction.';
              }
              return '';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Torque Prediction Error MAE (Nm / kg)',
            font: { family: "'Inter', sans-serif", size: 12, weight: '600' },
            color: '#475569'
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.8)'
          },
          ticks: {
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            color: '#64748b'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
            color: '#334155'
          }
        }
      }
    }
  });
}

/* =========================================================================
   3. BibTeX Copy-to-Clipboard
   ========================================================================= */
function initBibtexCopy() {
  const copyBtn = document.getElementById('copy-bibtex-btn');
  const bibtexContent = document.getElementById('bibtex-code');
  const toast = document.getElementById('copy-toast');

  if (!copyBtn || !bibtexContent) return;

  copyBtn.addEventListener('click', async () => {
    const textToCopy = (bibtexContent.innerText || bibtexContent.textContent).trim();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      if (toast) {
        toast.classList.remove('opacity-0', 'pointer-events-none');
        toast.classList.add('opacity-100');
        setTimeout(() => {
          toast.classList.remove('opacity-100');
          toast.classList.add('opacity-0', 'pointer-events-none');
        }, 2200);
      }
    } catch (err) {
      console.error('Failed to copy BibTeX: ', err);
    }
  });
}
