using Microsoft.AspNetCore.SignalR;
using Log4YM.Contracts.Api;
using Log4YM.Contracts.Models;
using Log4YM.Contracts.Events;
using Log4YM.Server.Core.Database;
using Log4YM.Server.Hubs;

namespace Log4YM.Server.Endpoints;

public static class QsoEndpoints
{
    public static void MapQsoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/qsos").WithTags("QSOs");

        group.MapGet("/", GetQsos).WithName("GetQsos");
        group.MapGet("/{id}", GetQsoById).WithName("GetQsoById");
        group.MapPost("/", CreateQso).WithName("CreateQso");
        group.MapPut("/{id}", UpdateQso).WithName("UpdateQso");
        group.MapDelete("/{id}", DeleteQso).WithName("DeleteQso");
        group.MapGet("/statistics", GetStatistics).WithName("GetQsoStatistics");
        group.MapPost("/search", SearchQsos).WithName("SearchQsos");
    }

    private static async Task<IResult> GetQsos(
        IQsoRepository repository,
        int limit = 100)
    {
        var qsos = await repository.GetRecentAsync(limit);
        return Results.Ok(qsos.Select(MapToResponse));
    }

    private static async Task<IResult> GetQsoById(
        string id,
        IQsoRepository repository)
    {
        var qso = await repository.GetByIdAsync(id);
        return qso is null ? Results.NotFound() : Results.Ok(MapToResponse(qso));
    }

    private static async Task<IResult> CreateQso(
        CreateQsoRequest request,
        IQsoRepository repository,
        IHubContext<LogHub, ILogHubClient> hub)
    {
        var qso = new Qso
        {
            Callsign = request.Callsign.ToUpperInvariant(),
            QsoDate = request.QsoDate,
            TimeOn = request.TimeOn,
            Band = request.Band,
            Mode = request.Mode,
            Frequency = request.Frequency,
            RstSent = request.RstSent,
            RstRcvd = request.RstRcvd,
            Comment = request.Comment,
            Station = new StationInfo
            {
                Name = request.Name,
                Grid = request.Grid,
                Country = request.Country
            }
        };

        var created = await repository.CreateAsync(qso);

        // Broadcast to all clients
        await hub.BroadcastQso(new QsoLoggedEvent(
            created.Id,
            created.Callsign,
            created.QsoDate,
            created.TimeOn,
            created.Band,
            created.Mode,
            created.Frequency,
            created.RstSent,
            created.RstRcvd,
            created.Station?.Grid
        ));

        return Results.Created($"/api/qsos/{created.Id}", MapToResponse(created));
    }

    private static async Task<IResult> UpdateQso(
        string id,
        UpdateQsoRequest request,
        IQsoRepository repository)
    {
        var existing = await repository.GetByIdAsync(id);
        if (existing is null) return Results.NotFound();

        if (request.Callsign != null) existing.Callsign = request.Callsign.ToUpperInvariant();
        if (request.QsoDate.HasValue) existing.QsoDate = request.QsoDate.Value;
        if (request.TimeOn != null) existing.TimeOn = request.TimeOn;
        if (request.Band != null) existing.Band = request.Band;
        if (request.Mode != null) existing.Mode = request.Mode;
        if (request.Frequency.HasValue) existing.Frequency = request.Frequency;
        if (request.RstSent != null) existing.RstSent = request.RstSent;
        if (request.RstRcvd != null) existing.RstRcvd = request.RstRcvd;
        if (request.Comment != null) existing.Comment = request.Comment;

        existing.Station ??= new StationInfo();
        if (request.Name != null) existing.Station.Name = request.Name;
        if (request.Grid != null) existing.Station.Grid = request.Grid;
        if (request.Country != null) existing.Station.Country = request.Country;

        await repository.UpdateAsync(id, existing);
        return Results.Ok(MapToResponse(existing));
    }

    private static async Task<IResult> DeleteQso(
        string id,
        IQsoRepository repository)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? Results.NoContent() : Results.NotFound();
    }

    private static async Task<IResult> GetStatistics(IQsoRepository repository)
    {
        var stats = await repository.GetStatisticsAsync();
        return Results.Ok(stats);
    }

    private static async Task<IResult> SearchQsos(
        QsoSearchRequest request,
        IQsoRepository repository)
    {
        var qsos = await repository.SearchAsync(request);
        return Results.Ok(qsos.Select(MapToResponse));
    }

    private static QsoResponse MapToResponse(Qso qso) => new(
        qso.Id,
        qso.Callsign,
        qso.QsoDate,
        qso.TimeOn,
        qso.TimeOff,
        qso.Band,
        qso.Mode,
        qso.Frequency,
        qso.RstSent,
        qso.RstRcvd,
        qso.Station is null ? null : new StationInfoDto(
            qso.Station.Name,
            qso.Station.Grid,
            qso.Station.Country,
            qso.Station.Dxcc,
            qso.Station.State,
            qso.Station.Continent,
            qso.Station.Latitude,
            qso.Station.Longitude
        ),
        qso.Comment,
        qso.CreatedAt
    );
}
