import { openDB } from "idb";
import { useState, useRef, useEffect } from "react";
import TimerDisplay from "./TimerDisplay";
import TimerControls from "./TimerControls";
import Stats from "./Stats";
import Preset from "./Preset";

const dbPromise = openDB("timer-store", 1, {
  upgrade(db) {
    db.createObjectStore("timer");
  },
});

const Timer = () => {
  const timerRef = useRef(null);
  const [isPresetSelected, setIsPresetSelected] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [targetTime, setTargetTime] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(() => {
    return Number(localStorage.getItem("weeklyTotal") || 0);
  });
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    return Number(localStorage.getItem("sessionsCompleted") || 0);
  });
  const [debugInfo, setDebugInfo] = useState([]);
  const [showDebug, setShowDebug] = useState(false);

  // Helper function to add debug messages
  const addDebugInfo = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo((prev) => [...prev.slice(-4), `${timestamp}: ${message}`]);
  };

  // Helper function to get current date string (using local timezone)
  const getCurrentDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to get current week string (year + week number)
  const getCurrentWeekString = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  };

  useEffect(() => {
    const loadState = async () => {
      try {
        const today = getCurrentDateString();
        const currentWeek = getCurrentWeekString();
        const lastSavedDate = localStorage.getItem("lastSavedDate");
        const lastSavedWeek = localStorage.getItem("lastSavedWeek");
        const saved = await (await dbPromise).get("timer", "current-state");

        addDebugInfo(`Date check: ${today} vs ${lastSavedDate}`);
        addDebugInfo(`Week check: ${currentWeek} vs ${lastSavedWeek}`);

        // Initialize date and week if not set (first time use)
        if (!lastSavedDate) {
          addDebugInfo("First time use, initializing");
          localStorage.setItem("lastSavedDate", today);
          localStorage.setItem("lastSavedWeek", currentWeek);
          setDailyTotal(0);
          setWeeklyTotal(0);
          localStorage.setItem("dailyTotal", "0");
          localStorage.setItem("weeklyTotal", "0");
          return;
        }

        // Check if we need to reset daily totals
        if (lastSavedDate !== today) {
          addDebugInfo("NEW DAY - Resetting daily total");
          setDailyTotal(0);
          localStorage.setItem("dailyTotal", "0");
          localStorage.setItem("lastSavedDate", today);
          await (await dbPromise).put("timer", null, "current-state"); // Clear saved state
        } else {
          // Same day, restore daily total
          const storedDaily = Number(localStorage.getItem("dailyTotal") || 0);
          addDebugInfo(`Same day, restoring daily: ${storedDaily}s`);
          setDailyTotal(storedDaily);
        }

        // Check if we need to reset weekly totals
        if (lastSavedWeek !== currentWeek) {
          addDebugInfo("NEW WEEK - Resetting weekly total");
          setWeeklyTotal(0);
          localStorage.setItem("weeklyTotal", "0");
          localStorage.setItem("lastSavedWeek", currentWeek);
        } else {
          // Same week, restore weekly total
          const storedWeekly = Number(localStorage.getItem("weeklyTotal") || 0);
          addDebugInfo(`Same week, restoring weekly: ${storedWeekly}s`);
          setWeeklyTotal(storedWeekly);
        }

        // Only restore non-timer states if same day and saved data exists
        if (saved && lastSavedDate === today) {
          addDebugInfo("Restoring saved timer state");
          setTargetTime(saved.targetTime || 0);
          setSessionComplete(saved.sessionComplete || false);
          setIsPresetSelected((saved.targetTime || 0) > 0);

          // Important: Don't auto-restore running state
          if (saved.isRunning) {
            // Reset the timer but keep target
            setAccumulatedTime(0);
            setDisplayTime(0);
            setStartTime(null);
            setIsRunning(false);
          }
        }
      } catch (error) {
        addDebugInfo(`ERROR: ${error.message}`);
      }
    };

    loadState();
  }, []);

  const selectPresetTime = (minutes) => {
    resetTimer();
    setTargetTime(minutes * 60);
    setIsPresetSelected(true); // Set to true when preset is selected
  };

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

  // Handle session completion
  const handleSessionComplete = (currentTime) => {
    // First clean up any running timers
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }

    // Then update state
    const newDailyTotal = dailyTotal + currentTime;
    const newWeeklyTotal = weeklyTotal + currentTime;
    addDebugInfo(`Session complete: +${currentTime}s to totals`);
    setDailyTotal(newDailyTotal);
    setWeeklyTotal(newWeeklyTotal);
    setSessionsCompleted((prev) => prev + 1);
    setIsRunning(false);
    setSessionComplete(true);
    setStartTime(null);
    setAccumulatedTime(0);
  };

  // Main timer effect
  useEffect(() => {
    let wakeLock;
    let visibilityHandler;
    let lastUpdateTime = Date.now();
    let wakeLockRetryTimer;
    let isActive = true;

    const updateTimer = () => {
      if (!isActive) return;

      const now = Date.now();
      const currentTime = getCurrentTime();

      if (
        now - lastUpdateTime >= 1000 ||
        document.visibilityState === "visible"
      ) {
        setDisplayTime(currentTime);
        lastUpdateTime = now;

        if (targetTime > 0 && currentTime >= targetTime && isRunning) {
          handleSessionComplete(currentTime);
          return;
        }
      }

      if (isRunning) {
        timerRef.current = requestAnimationFrame(updateTimer);
      }
    };

    const handleVisibilityChange = () => {
      if (!isActive) return;

      if (document.visibilityState === "visible" && isRunning) {
        lastUpdateTime = 0;
        updateTimer();
        reacquireWakeLock(); // Reacquire when coming back to foreground
      } else if (document.visibilityState === "hidden") {
        // Save state when going to background
        backupTimerState();
      }
    };

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => {
            if (isRunning && isActive) {
              // Schedule retry if released unexpectedly
              wakeLockRetryTimer = setTimeout(requestWakeLock, 1000);
            }
          });
        }
      } catch (err) {
        console.error("Wake Lock error:", err);
        // Retry on failure
        if (isRunning && isActive) {
          wakeLockRetryTimer = setTimeout(requestWakeLock, 2000);
        }
      }
    };

    const reacquireWakeLock = () => {
      if (wakeLockRetryTimer) {
        clearTimeout(wakeLockRetryTimer);
      }
      requestWakeLock();
    };

    const backupTimerState = async () => {
      try {
        await (
          await dbPromise
        ).put(
          "timer",
          {
            // Never save as running - force user to manually restart
            isRunning: false,
            targetTime,
            sessionComplete,
            // Save other non-timer states...
          },
          "current-state"
        );
      } catch (error) {
        console.error("Backup failed:", error);
      }
    };

    if (isRunning) {
      requestWakeLock();
      visibilityHandler = handleVisibilityChange;
      document.addEventListener("visibilitychange", visibilityHandler);
      updateTimer();
    }

    return () => {
      isActive = false;

      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
      if (wakeLock) {
        wakeLock.removeEventListener("release", requestWakeLock);
        wakeLock.release().catch(console.error);
      }
      if (wakeLockRetryTimer) {
        clearTimeout(wakeLockRetryTimer);
      }
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, [isRunning, startTime, accumulatedTime, targetTime]);

  // Persist data to localStorage
  useEffect(() => {
    localStorage.setItem("dailyTotal", dailyTotal.toString());
    localStorage.setItem("weeklyTotal", weeklyTotal.toString());
    localStorage.setItem("sessionsCompleted", sessionsCompleted.toString());
  }, [dailyTotal, weeklyTotal, sessionsCompleted]);

  // Add this useEffect with your other effects
  useEffect(() => {
    const saveTimerState = async () => {
      await (
        await dbPromise
      ).put(
        "timer",
        {
          startTime,
          accumulatedTime,
          targetTime,
          isRunning,
          sessionComplete,
          displayTime,
        },
        "current-state"
      );
    };

    // Save every 30 seconds when running
    const interval = setInterval(() => {
      if (isRunning) saveTimerState();
    }, 30000);

    return () => clearInterval(interval);
  }, [
    startTime,
    accumulatedTime,
    targetTime,
    isRunning,
    sessionComplete,
    displayTime,
  ]);

  const toggleTimer = () => {
    if (!isPresetSelected && !isRunning) return;

    if (isRunning) {
      // Pause logic
      setAccumulatedTime(getCurrentTime());
      setStartTime(null);
      setIsRunning(false);
    } else {
      // Start logic - always reset if starting fresh
      if (sessionComplete || !isRunning) {
        setAccumulatedTime(0);
        setDisplayTime(0);
      }
      setStartTime(Date.now());
      setIsRunning(true);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
    setAccumulatedTime(0);
    setDisplayTime(0);
    setStartTime(null);
    setTargetTime(0);
    setSessionComplete(false);
    setIsRunning(false);
    setIsPresetSelected(false); // Reset on full timer reset
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ""}${
      mins > 0 || hrs > 0 ? `${mins}m ` : ""
    }${secs}s`;
  };

  const formatTimeForTotals = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs > 0 ? `${hrs}h ` : ""}${mins}m`;
  };

  return (
    <div
      className="flex flex-col p-6 overflow-y-auto lg:mx-auto md:max-w-2xl lg:max-w-4xl"
      style={{ height: "calc(var(--app-height, 100vh) - 1px)" }}
    >
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-700 text-center flex-1">
            Choose your Time
          </h3>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600"
          >
            Debug
          </button>
        </div>

        {showDebug && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border text-xs">
            <p className="font-semibold mb-2">Debug Info:</p>
            {debugInfo.length === 0 ? (
              <p className="text-gray-500">No debug messages yet</p>
            ) : (
              debugInfo.map((msg, i) => (
                <p key={i} className="text-gray-700 mb-1">
                  {msg}
                </p>
              ))
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {presetTimes.map((preset) => (
            <Preset
              key={preset.minutes}
              preset={preset}
              selectPresetTime={selectPresetTime}
              targetTime={targetTime}
            />
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
        isPresetSelected={isPresetSelected}
        toggleTimer={toggleTimer}
        isRunning={isRunning}
        resetTimer={resetTimer}
        sessionComplete={sessionComplete}
      />
      {/* stats */}
      <Stats
        formatTimeForTotals={formatTimeForTotals}
        dailyTotal={dailyTotal}
        weeklyTotal={weeklyTotal}
      />
    </div>
  );
};

export default Timer;
