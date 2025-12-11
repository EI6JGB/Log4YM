using MongoDB.Driver;
using Log4YM.Contracts.Models;
using Log4YM.Contracts.Api;

namespace Log4YM.Server.Core.Database;

public interface IQsoRepository
{
    Task<Qso?> GetByIdAsync(string id);
    Task<IEnumerable<Qso>> GetRecentAsync(int limit = 100);
    Task<IEnumerable<Qso>> SearchAsync(QsoSearchRequest criteria);
    Task<Qso> CreateAsync(Qso qso);
    Task<bool> UpdateAsync(string id, Qso qso);
    Task<bool> DeleteAsync(string id);
    Task<QsoStatistics> GetStatisticsAsync();
    Task<int> GetCountAsync();
}

public class QsoRepository : IQsoRepository
{
    private readonly IMongoCollection<Qso> _collection;

    public QsoRepository(MongoDbContext context)
    {
        _collection = context.Qsos;
    }

    public async Task<Qso?> GetByIdAsync(string id)
    {
        return await _collection.Find(q => q.Id == id).FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<Qso>> GetRecentAsync(int limit = 100)
    {
        return await _collection
            .Find(_ => true)
            .SortByDescending(q => q.QsoDate)
            .ThenByDescending(q => q.TimeOn)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<Qso>> SearchAsync(QsoSearchRequest criteria)
    {
        var builder = Builders<Qso>.Filter;
        var filter = builder.Empty;

        if (!string.IsNullOrEmpty(criteria.Callsign))
            filter &= builder.Regex(q => q.Callsign, new MongoDB.Bson.BsonRegularExpression(criteria.Callsign, "i"));

        if (!string.IsNullOrEmpty(criteria.Band))
            filter &= builder.Eq(q => q.Band, criteria.Band);

        if (!string.IsNullOrEmpty(criteria.Mode))
            filter &= builder.Eq(q => q.Mode, criteria.Mode);

        if (criteria.FromDate.HasValue)
            filter &= builder.Gte(q => q.QsoDate, criteria.FromDate.Value);

        if (criteria.ToDate.HasValue)
            filter &= builder.Lte(q => q.QsoDate, criteria.ToDate.Value);

        if (criteria.Dxcc.HasValue)
            filter &= builder.Eq("station.dxcc", criteria.Dxcc.Value);

        return await _collection
            .Find(filter)
            .SortByDescending(q => q.QsoDate)
            .Skip(criteria.Skip)
            .Limit(criteria.Limit)
            .ToListAsync();
    }

    public async Task<Qso> CreateAsync(Qso qso)
    {
        qso.CreatedAt = DateTime.UtcNow;
        qso.UpdatedAt = DateTime.UtcNow;
        await _collection.InsertOneAsync(qso);
        return qso;
    }

    public async Task<bool> UpdateAsync(string id, Qso qso)
    {
        qso.UpdatedAt = DateTime.UtcNow;
        var result = await _collection.ReplaceOneAsync(q => q.Id == id, qso);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _collection.DeleteOneAsync(q => q.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<QsoStatistics> GetStatisticsAsync()
    {
        var builder = Builders<Qso>.Filter;
        var emptyFilter = builder.Empty;

        var totalQsos = await _collection.CountDocumentsAsync(emptyFilter);

        var uniqueCallsigns = await _collection.Distinct(q => q.Callsign, emptyFilter).ToListAsync();
        var uniqueDxcc = await _collection.Distinct<int?>("station.dxcc", emptyFilter).ToListAsync();
        var uniqueGrids = await _collection.Distinct<string?>("station.grid", emptyFilter).ToListAsync();

        // Count today's QSOs
        var today = DateTime.UtcNow.Date;
        var todayFilter = builder.Gte(q => q.QsoDate, today);
        var qsosToday = await _collection.CountDocumentsAsync(todayFilter);

        // Aggregate by band
        var bandAgg = await _collection.Aggregate()
            .Group(q => q.Band, g => new { Band = g.Key, Count = g.Count() })
            .ToListAsync();

        // Aggregate by mode
        var modeAgg = await _collection.Aggregate()
            .Group(q => q.Mode, g => new { Mode = g.Key, Count = g.Count() })
            .ToListAsync();

        return new QsoStatistics(
            TotalQsos: (int)totalQsos,
            UniqueCallsigns: uniqueCallsigns.Count,
            UniqueCountries: uniqueDxcc.Count(d => d.HasValue),
            UniqueGrids: uniqueGrids.Count(g => !string.IsNullOrEmpty(g)),
            QsosToday: (int)qsosToday,
            QsosByBand: bandAgg.ToDictionary(x => x.Band ?? "Unknown", x => x.Count),
            QsosByMode: modeAgg.ToDictionary(x => x.Mode ?? "Unknown", x => x.Count)
        );
    }

    public async Task<int> GetCountAsync()
    {
        return (int)await _collection.CountDocumentsAsync(_ => true);
    }
}
