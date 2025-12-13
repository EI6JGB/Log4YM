using Log4YM.Contracts.Models;
using Log4YM.Server.Core.Database;

namespace Log4YM.Server.Services;

public interface ISettingsService
{
    Task<UserSettings> GetSettingsAsync(string id = "default");
    Task<UserSettings> SaveSettingsAsync(UserSettings settings);
}

public class SettingsService : ISettingsService
{
    private readonly ISettingsRepository _repository;

    public SettingsService(ISettingsRepository repository)
    {
        _repository = repository;
    }

    public async Task<UserSettings> GetSettingsAsync(string id = "default")
    {
        var settings = await _repository.GetAsync(id);
        return settings ?? new UserSettings { Id = id };
    }

    public async Task<UserSettings> SaveSettingsAsync(UserSettings settings)
    {
        return await _repository.UpsertAsync(settings);
    }
}
