namespace DBMerger
{
    public class Config(
        string newDBPath,
        string oldDBPath,
        bool debug,
        bool importConfig,
        bool preserveOverlappingData = false,
        bool preserveConfigValues = false)
    {
        public string NewDBPath { get; } = newDBPath;
        public string OldDBPath { get; } = oldDBPath;
        public bool Debug { get; } = debug;
        public bool ImportConfig { get; } = importConfig;
        public bool PreserveOverlappingData { get; } = preserveOverlappingData;
        public bool PreserveConfigValues { get; } = preserveConfigValues;
    }
}
