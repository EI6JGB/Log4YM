using System.Text.Json;

namespace Log4YM.Server.Services;

public interface IUserConfigService
{
    Task<UserConfig> GetConfigAsync();
    Task SaveConfigAsync(UserConfig config);
    bool IsConfigured();
    string GetConfigPath();
}

public class UserConfig
{
    public string? MongoDbConnectionString { get; set; }
    public string? MongoDbDatabaseName { get; set; }
    public DateTime? ConfiguredAt { get; set; }
}

public class UserConfigService : IUserConfigService
{
    private readonly string _configPath;
    private readonly ILogger<UserConfigService> _logger;
    private UserConfig? _cachedConfig;

    public UserConfigService(ILogger<UserConfigService> logger)
    {
        _logger = logger;
        _configPath = GetPlatformConfigPath();
        _logger.LogInformation("User config path: {ConfigPath}", _configPath);
    }

    private static string GetPlatformConfigPath()
    {
        string configDir;

        if (OperatingSystem.IsMacOS())
        {
            configDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Library", "Application Support", "Log4YM");
        }
        else if (OperatingSystem.IsWindows())
        {
            configDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Log4YM");
        }
        else // Linux
        {
            configDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                ".config", "Log4YM");
        }

        return Path.Combine(configDir, "config.json");
    }

    public string GetConfigPath() => _configPath;

    public bool IsConfigured()
    {
        if (_cachedConfig != null)
            return !string.IsNullOrEmpty(_cachedConfig.MongoDbConnectionString);

        if (!File.Exists(_configPath))
            return false;

        try
        {
            var json = File.ReadAllText(_configPath);
            var config = JsonSerializer.Deserialize<UserConfig>(json);
            return !string.IsNullOrEmpty(config?.MongoDbConnectionString);
        }
        catch
        {
            return false;
        }
    }

    public async Task<UserConfig> GetConfigAsync()
    {
        if (_cachedConfig != null)
            return _cachedConfig;

        if (!File.Exists(_configPath))
        {
            _cachedConfig = new UserConfig();
            return _cachedConfig;
        }

        try
        {
            var json = await File.ReadAllTextAsync(_configPath);
            _cachedConfig = JsonSerializer.Deserialize<UserConfig>(json) ?? new UserConfig();
            return _cachedConfig;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read config from {Path}", _configPath);
            _cachedConfig = new UserConfig();
            return _cachedConfig;
        }
    }

    public async Task SaveConfigAsync(UserConfig config)
    {
        var directory = Path.GetDirectoryName(_configPath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        config.ConfiguredAt = DateTime.UtcNow;

        var json = JsonSerializer.Serialize(config, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        await File.WriteAllTextAsync(_configPath, json);
        _cachedConfig = config;

        _logger.LogInformation("Configuration saved to {Path}", _configPath);
    }
}
