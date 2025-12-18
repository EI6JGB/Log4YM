using Microsoft.AspNetCore.Mvc;
using Log4YM.Contracts.Api;
using Log4YM.Contracts.Models;
using Log4YM.Server.Services;
using Log4YM.Server.Core.Database;

namespace Log4YM.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class QrzController : ControllerBase
{
    private readonly IQrzService _qrzService;
    private readonly IQsoRepository _qsoRepository;
    private readonly ISettingsRepository _settingsRepository;
    private readonly ILogger<QrzController> _logger;

    public QrzController(
        IQrzService qrzService,
        IQsoRepository qsoRepository,
        ISettingsRepository settingsRepository,
        ILogger<QrzController> logger)
    {
        _qrzService = qrzService;
        _qsoRepository = qsoRepository;
        _settingsRepository = settingsRepository;
        _logger = logger;
    }

    /// <summary>
    /// Check QRZ subscription status
    /// </summary>
    [HttpGet("subscription")]
    [ProducesResponseType(typeof(QrzSubscriptionResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QrzSubscriptionResponse>> CheckSubscription()
    {
        var status = await _qrzService.CheckSubscriptionAsync();
        return Ok(new QrzSubscriptionResponse(
            status.IsValid,
            status.HasXmlSubscription,
            status.Username,
            status.Message,
            status.ExpirationDate
        ));
    }

    /// <summary>
    /// Update QRZ settings
    /// </summary>
    [HttpPut("settings")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateSettings([FromBody] QrzSettingsRequest request)
    {
        if (string.IsNullOrEmpty(request.Username))
        {
            return BadRequest("Username is required");
        }

        var settings = await _settingsRepository.GetAsync() ?? new UserSettings();
        settings.Qrz.Username = request.Username;
        settings.Qrz.Password = request.Password;
        settings.Qrz.ApiKey = request.ApiKey ?? string.Empty;
        settings.Qrz.Enabled = request.Enabled;

        await _settingsRepository.UpsertAsync(settings);

        // Verify the credentials
        var status = await _qrzService.CheckSubscriptionAsync();

        return Ok(new
        {
            Success = true,
            Message = status.Message,
            HasXmlSubscription = status.HasXmlSubscription
        });
    }

    /// <summary>
    /// Upload selected QSOs to QRZ logbook (manual upload)
    /// </summary>
    [HttpPost("upload")]
    [ProducesResponseType(typeof(QrzUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<QrzUploadResponse>> UploadQsos([FromBody] QrzUploadRequest request)
    {
        if (request.QsoIds == null || !request.QsoIds.Any())
        {
            return BadRequest("No QSO IDs provided");
        }

        _logger.LogInformation("Uploading {Count} QSOs to QRZ", request.QsoIds.Count());

        var qsos = await _qsoRepository.GetByIdsAsync(request.QsoIds);
        var qsoList = qsos.ToList();

        if (qsoList.Count == 0)
        {
            return BadRequest("No valid QSOs found for the provided IDs");
        }

        var result = await _qrzService.UploadQsosAsync(qsoList);

        return Ok(new QrzUploadResponse(
            result.TotalCount,
            result.SuccessCount,
            result.FailedCount,
            result.Results.Select(r => new QrzUploadResultDto(
                r.Success,
                r.LogId,
                r.Message,
                r.QsoId
            ))
        ));
    }

    /// <summary>
    /// Lookup a callsign on QRZ (requires XML subscription)
    /// </summary>
    [HttpGet("lookup/{callsign}")]
    [ProducesResponseType(typeof(QrzCallsignResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<QrzCallsignResponse>> LookupCallsign(string callsign)
    {
        try
        {
            var info = await _qrzService.LookupCallsignAsync(callsign);
            if (info == null)
            {
                return NotFound($"Callsign {callsign} not found");
            }

            return Ok(new QrzCallsignResponse(
                info.Callsign,
                info.Name,
                info.FirstName,
                info.Address,
                info.City,
                info.State,
                info.Country,
                info.Grid,
                info.Latitude,
                info.Longitude,
                info.Dxcc,
                info.CqZone,
                info.ItuZone,
                info.Email,
                info.QslManager,
                info.ImageUrl,
                info.LicenseExpiration
            ));
        }
        catch (QrzSubscriptionRequiredException)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                "QRZ XML subscription required for callsign lookups");
        }
    }
}
