const Preset = ({ preset, selectPresetTime, targetTime }) => {
  return (
    <button
      onClick={() => selectPresetTime(preset.minutes)}
      className={`py-3 rounded-xl font-medium transition-all text-sm md:text-base ${
        targetTime === preset.minutes * 60
          ? "bg-blue-500 text-white shadow-md scale-[0.98]"
          : "bg-white text-blue-600 border border-gray-200 active:scale-[0.98]"
      }`}
    >
      {preset.label}
    </button>
  );
};
export default Preset;
