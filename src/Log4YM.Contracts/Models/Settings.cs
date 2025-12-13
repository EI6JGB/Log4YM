using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Log4YM.Contracts.Models;

public class UserSettings
{
    [BsonId]
    public string Id { get; set; } = "default";

    [BsonElement("station")]
    public StationSettings Station { get; set; } = new();

    [BsonElement("qrz")]
    public QrzSettings Qrz { get; set; } = new();

    [BsonElement("appearance")]
    public AppearanceSettings Appearance { get; set; } = new();

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class StationSettings
{
    [BsonElement("callsign")]
    public string Callsign { get; set; } = string.Empty;

    [BsonElement("operatorName")]
    public string OperatorName { get; set; } = string.Empty;

    [BsonElement("gridSquare")]
    public string GridSquare { get; set; } = string.Empty;

    [BsonElement("latitude")]
    public double? Latitude { get; set; }

    [BsonElement("longitude")]
    public double? Longitude { get; set; }

    [BsonElement("city")]
    public string City { get; set; } = string.Empty;

    [BsonElement("country")]
    public string Country { get; set; } = string.Empty;
}

public class QrzSettings
{
    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("password")]
    public string Password { get; set; } = string.Empty; // Stored obfuscated

    [BsonElement("enabled")]
    public bool Enabled { get; set; }
}

public class AppearanceSettings
{
    [BsonElement("theme")]
    public string Theme { get; set; } = "dark";

    [BsonElement("compactMode")]
    public bool CompactMode { get; set; }
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
