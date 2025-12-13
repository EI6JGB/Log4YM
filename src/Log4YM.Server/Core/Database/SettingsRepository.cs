using MongoDB.Driver;
using Log4YM.Contracts.Models;

namespace Log4YM.Server.Core.Database;

public interface ISettingsRepository
{
    Task<UserSettings?> GetAsync(string id = "default");
    Task<UserSettings> UpsertAsync(UserSettings settings);
}

public class SettingsRepository : ISettingsRepository
{
    private readonly MongoDbContext _context;

    public SettingsRepository(MongoDbContext context)
    {
        _context = context;
    }

    public async Task<UserSettings?> GetAsync(string id = "default")
    {
        return await _context.Settings
            .Find(s => s.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<UserSettings> UpsertAsync(UserSettings settings)
    {
        settings.UpdatedAt = DateTime.UtcNow;

        var options = new ReplaceOptions { IsUpsert = true };
        await _context.Settings.ReplaceOneAsync(
            s => s.Id == settings.Id,
            settings,
            options
        );

        return settings;
    }
}
