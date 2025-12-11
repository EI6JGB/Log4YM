using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Log4YM.Contracts.Models;

public class StationSettings
{
    [BsonId]
    public string Id { get; set; } = "station";

    [BsonElement("callsign")]
    public string Callsign { get; set; } = null!;

    [BsonElement("grid")]
    public string Grid { get; set; } = null!;

    [BsonElement("latitude")]
    public double Latitude { get; set; }

    [BsonElement("longitude")]
    public double Longitude { get; set; }

    [BsonElement("qrzUsername")]
    public string? QrzUsername { get; set; }

    [BsonElement("name")]
    public string? Name { get; set; }

    [BsonElement("qth")]
    public string? Qth { get; set; }
}

public class PluginSettings
{
    [BsonId]
    public string Id { get; set; } = null!;  // Plugin ID

    [BsonElement("enabled")]
    public bool Enabled { get; set; } = true;

    [BsonExtraElements]
    public BsonDocument? Settings { get; set; }
}

public class Layout
{
    [BsonId]
    public string Id { get; set; } = null!;

    [BsonElement("name")]
    public string Name { get; set; } = null!;

    [BsonElement("isDefault")]
    public bool IsDefault { get; set; }

    [BsonElement("layout")]
    public BsonDocument LayoutJson { get; set; } = null!;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
