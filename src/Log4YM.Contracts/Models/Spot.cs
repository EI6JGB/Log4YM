using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Log4YM.Contracts.Models;

public class Spot
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("dxCall")]
    public string DxCall { get; set; } = null!;

    [BsonElement("spotter")]
    public string Spotter { get; set; } = null!;

    [BsonElement("frequency")]
    public double Frequency { get; set; }

    [BsonElement("mode")]
    public string? Mode { get; set; }

    [BsonElement("comment")]
    public string? Comment { get; set; }

    [BsonElement("source")]
    public string? Source { get; set; }

    [BsonElement("timestamp")]
    public DateTime Timestamp { get; set; }

    [BsonElement("dxStation")]
    public SpotStationInfo? DxStation { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SpotStationInfo
{
    [BsonElement("country")]
    public string? Country { get; set; }

    [BsonElement("dxcc")]
    public int? Dxcc { get; set; }

    [BsonElement("grid")]
    public string? Grid { get; set; }

    [BsonElement("continent")]
    public string? Continent { get; set; }
}
