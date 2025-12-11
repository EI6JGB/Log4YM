using MongoDB.Driver;
using Log4YM.Contracts.Models;

namespace Log4YM.Server.Core.Database;

public interface ISpotRepository
{
    Task<IEnumerable<Spot>> GetRecentAsync(int limit = 100);
    Task<IEnumerable<Spot>> GetByBandAsync(double minFreq, double maxFreq, int limit = 50);
    Task<Spot> CreateAsync(Spot spot);
    Task<int> GetCountAsync();
}

public class SpotRepository : ISpotRepository
{
    private readonly IMongoCollection<Spot> _collection;

    public SpotRepository(MongoDbContext context)
    {
        _collection = context.Spots;
    }

    public async Task<IEnumerable<Spot>> GetRecentAsync(int limit = 100)
    {
        return await _collection
            .Find(_ => true)
            .SortByDescending(s => s.Timestamp)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<Spot>> GetByBandAsync(double minFreq, double maxFreq, int limit = 50)
    {
        return await _collection
            .Find(s => s.Frequency >= minFreq && s.Frequency <= maxFreq)
            .SortByDescending(s => s.Timestamp)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<Spot> CreateAsync(Spot spot)
    {
        spot.CreatedAt = DateTime.UtcNow;
        await _collection.InsertOneAsync(spot);
        return spot;
    }

    public async Task<int> GetCountAsync()
    {
        return (int)await _collection.CountDocumentsAsync(_ => true);
    }
}
