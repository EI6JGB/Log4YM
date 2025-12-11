using Log4YM.Contracts.Models;
using Log4YM.Server.Core.Database;

namespace Log4YM.Server.Endpoints;

public static class SpotEndpoints
{
    public static void MapSpotEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/spots").WithTags("Spots");

        group.MapGet("/", GetSpots).WithName("GetSpots");
        group.MapGet("/band", GetSpotsByBand).WithName("GetSpotsByBand");
    }

    private static async Task<IResult> GetSpots(
        ISpotRepository repository,
        int limit = 100)
    {
        var spots = await repository.GetRecentAsync(limit);
        return Results.Ok(spots);
    }

    private static async Task<IResult> GetSpotsByBand(
        ISpotRepository repository,
        double minFreq,
        double maxFreq,
        int limit = 50)
    {
        var spots = await repository.GetByBandAsync(minFreq, maxFreq, limit);
        return Results.Ok(spots);
    }
}
