import { useState, useRef, useEffect } from "react";
import TimerDisplay from "./TimerDisplay";
import TimerControls from "./TimerControls";

const Timer = () => {
  const timerRef = useRef(null);
  const [startTime, setStartTime] = useState(null);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [targetTime, setTargetTime] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [dailyTotal, setDailyTotal] = useState(() => {
    return Number(localStorage.getItem("dailyTotal") || 0);
  });
  const [weeklyTotal, setWeeklyTotal] = useState(() => {
    return Number(localStorage.getItem("weeklyTotal") || 0);
  });
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    return Number(localStorage.getItem("sessionsCompleted") || 0);
  });

  const presetTimes = [
    { minutes: 15, label: "15 min" },
    { minutes: 30, label: "30 min" },
    { minutes: 45, label: "45 min" },
    { minutes: 60, label: "1 hour" },
  ];

  // Calculate current time accurately
  const getCurrentTime = () => {
    if (!isRunning || !startTime) return accumulatedTime;
    return accumulatedTime + Math.floor((Date.now() - startTime) / 1000);
  };

  // Calculate remaining time
  const remainingTime =
    targetTime > 0 ? Math.max(0, targetTime - displayTime) : 0;

  // Update display time and handle background execution
  useEffect(() => {
    let wakeLock;
    let visibilityChangeHandler;

    const updateDisplay = () => {
      const current = getCurrentTime();
      setDisplayTime(current);

      if (targetTime > 0 && current >= targetTime) {
        handleSessionComplete(current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isRunning) {
        // When going to background, store current time
        const current = getCurrentTime();
        setAccumulatedTime(current);
        setStartTime(Date.now()); // Reset start time for when we come back
      }
    };

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.error("Wake Lock error:", err);
      }
    };

    if (isRunning) {
      // Start wake lock
      requestWakeLock();

      // Set up visibility change handler
      visibilityChangeHandler = handleVisibilityChange;
      document.addEventListener("visibilitychange", visibilityChangeHandler);

      // Initial update
      updateDisplay();

      // Set up interval for UI updates
      timerRef.current = setInterval(updateDisplay, 250);
    }

    return () => {
      // Cleanup
      clearInterval(timerRef.current);
      if (wakeLock) wakeLock.release();
      if (visibilityChangeHandler) {
        document.removeEventListener(
          "visibilitychange",
          visibilityChangeHandler
        );
      }
    };
  }, [isRunning, startTime, accumulatedTime, targetTime]);

  const handleSessionComplete = (currentTime) => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setSessionComplete(true);
    const newDailyTotal = dailyTotal + currentTime;
    const newWeeklyTotal = weeklyTotal + currentTime;
    setDailyTotal(newDailyTotal);
    setWeeklyTotal(newWeeklyTotal);
    setSessionsCompleted((prev) => prev + 1);
  };

  // Persist data to localStorage
  useEffect(() => {
    localStorage.setItem("dailyTotal", dailyTotal);
    localStorage.setItem("weeklyTotal", weeklyTotal);
    localStorage.setItem("sessionsCompleted", sessionsCompleted);
  }, [dailyTotal, weeklyTotal, sessionsCompleted]);

  const toggleTimer = () => {
    if (isRunning) {
      // Pause logic
      setAccumulatedTime(getCurrentTime());
      setStartTime(null);
    } else {
      // Start logic
      if (sessionComplete) {
        setAccumulatedTime(0);
        setDisplayTime(0);
        setSessionComplete(false);
      }
      setStartTime(Date.now());
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setAccumulatedTime(0);
    setDisplayTime(0);
    setStartTime(null);
    setTargetTime(0);
    setSessionComplete(false);
  };

  const selectPresetTime = (minutes) => {
    resetTimer();
    setTargetTime(minutes * 60);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ""}${
      mins > 0 || hrs > 0 ? `${mins}m ` : ""
    }${secs}s`;
  };

  return (
    <div
      className="flex flex-col p-6 overflow-y-auto"
      style={{ height: "calc(var(--app-height, 100vh) - 1px)" }}
    >
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-3 text-gray-700 text-center">
          Study Duration
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {presetTimes.map((preset) => (
            <button
              key={preset.minutes}
              onClick={() => selectPresetTime(preset.minutes)}
              className={`py-3 rounded-xl font-medium transition-all ${
                targetTime === preset.minutes * 60
                  ? "bg-blue-500 text-white shadow-md scale-[0.98]"
                  : "bg-white text-blue-600 border border-gray-200 active:scale-[0.98]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <TimerDisplay time={displayTime} targetTime={targetTime} />
      </div>

      {targetTime > 0 && (
        <div className="text-center text-sm text-gray-500 mb-6">
          <p className="text-3xl">{formatTime(remainingTime)} remaining</p>
        </div>
      )}

      <TimerControls
        toggleTimer={toggleTimer}
        isRunning={isRunning}
        resetTimer={resetTimer}
        sessionComplete={sessionComplete}
      />

      <div className="mt-4 p-4 bg-white bg-opacity-80 rounded-xl shadow-inner">
        <div className="flex justify-between text-sm">
          <div className="text-center">
            <p className="text-gray-500">Today</p>
            <p className="font-medium">{formatTime(dailyTotal)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">Sessions</p>
            <p className="font-medium">{sessionsCompleted}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">Week</p>
            <p className="font-medium">{formatTime(weeklyTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
