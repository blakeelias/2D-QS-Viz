import React, { useRef, useState } from 'react';

function GraphPerfTester({ graphElementId }) {
  const [testRunning, setTestRunning] = useState(false);
  const [results, setResults] = useState(null);
  const fpsTrackerRef = useRef(null);

  // --- Performance Tracker ---
  class PerfTracker {
    constructor() {
      this.frames = 0;
      this.lastFPSUpdate = performance.now();
      this.fpsSamples = [];
      this.interactionStart = null;
      this.rafId = null;
    }

    startTracking() {
      const trackFPS = (now = performance.now()) => {
        this.frames++;
        if (now - this.lastFPSUpdate >= 1000) {
          this.fpsSamples.push(this.frames);
          this.frames = 0;
          this.lastFPSUpdate = now;
        }
        this.rafId = requestAnimationFrame(trackFPS);
      };
      this.rafId = requestAnimationFrame(trackFPS);
    }

    stopTracking() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
    }

    markInteractionStart() {
      performance.mark('interaction-start');
      this.interactionStart = performance.now();
    }

    markInteractionEnd() {
      performance.mark('interaction-end');
      performance.measure('interaction-duration', 'interaction-start', 'interaction-end');
      const measures = performance.getEntriesByName('interaction-duration');
      const duration = measures[measures.length - 1]?.duration || 0;
      performance.clearMarks();
      performance.clearMeasures();
      return duration;
    }

    getAverageFPS() {
      if (this.fpsSamples.length === 0) return 0;
      const sum = this.fpsSamples.reduce((a, b) => a + b, 0);
      return (sum / this.fpsSamples.length).toFixed(2);
    }
  }

  // --- Interaction Simulator ---
  const simulateDrag = ({ element, startX, startY, endX, endY, steps = 10, interval = 16 }) => {
    return new Promise((resolve) => {
      let step = 0;
      const deltaX = (endX - startX) / steps;
      const deltaY = (endY - startY) / steps;

      const move = () => {
        const x = startX + deltaX * step;
        const y = startY + deltaY * step;
        dispatchMouseEvent('mousemove', x, y);
        step++;
        if (step <= steps) {
          setTimeout(move, interval);
        } else {
          dispatchMouseEvent('mouseup', endX, endY);
          resolve();
        }
      };

      dispatchMouseEvent('mousedown', startX, startY);
      move();

      function dispatchMouseEvent(type, clientX, clientY) {
        const event = new MouseEvent(type, {
          clientX,
          clientY,
          bubbles: true,
          cancelable: true,
          view: window,
        });
        element.dispatchEvent(event);
      }
    });
  };

  // --- Test Runner ---
  const runTest = async () => {
    const graphElement = document.getElementById(graphElementId);
    if (!graphElement) {
      console.error('Graph element not found');
      return;
    }

    setTestRunning(true);
    fpsTrackerRef.current = new PerfTracker();
    fpsTrackerRef.current.startTracking();

    await new Promise((r) => setTimeout(r, 500)); // Stabilize FPS
    fpsTrackerRef.current.markInteractionStart();

    await simulateDrag({
      element: graphElement,
      startX: 100,
      startY: 100,
      endX: 400,
      endY: 400,
      steps: 60,
      interval: 16,
    });

    const interactionDuration = fpsTrackerRef.current.markInteractionEnd();
    fpsTrackerRef.current.stopTracking();
    const avgFPS = fpsTrackerRef.current.getAverageFPS();

    setResults({
      avgFPS,
      interactionDuration: interactionDuration.toFixed(2),
    });

    setTestRunning(false);
  };

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid gray', borderRadius: '8px', textAlign: 'right' }}>
      <h3>Graph Performance Tester</h3>
      <button onClick={runTest} disabled={testRunning}>
        {testRunning ? 'Running Test...' : 'Run Test'}
      </button>
      {results && (
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Average FPS:</strong> {results.avgFPS}</p>
          <p><strong>Interaction Duration:</strong> {results.interactionDuration} ms</p>
        </div>
      )}
    </div>
  );
}

export default GraphPerfTester;
