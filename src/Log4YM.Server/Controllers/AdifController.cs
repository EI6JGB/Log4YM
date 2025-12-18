using Microsoft.AspNetCore.Mvc;
using Log4YM.Contracts.Api;
using Log4YM.Server.Services;

namespace Log4YM.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AdifController : ControllerBase
{
    private readonly IAdifService _adifService;
    private readonly ILogger<AdifController> _logger;

    public AdifController(IAdifService adifService, ILogger<AdifController> logger)
    {
        _adifService = adifService;
        _logger = logger;
    }

    /// <summary>
    /// Import ADIF file into the log
    /// </summary>
    [HttpPost("import")]
    [ProducesResponseType(typeof(AdifImportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB limit
    public async Task<ActionResult<AdifImportResponse>> ImportAdif(
        IFormFile file,
        [FromQuery] bool skipDuplicates = true)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file provided");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".adi" && extension != ".adif" && extension != ".xml")
        {
            return BadRequest("Invalid file type. Expected .adi, .adif, or .xml");
        }

        _logger.LogInformation("Importing ADIF file: {FileName} ({Size} bytes)",
            file.FileName, file.Length);

        await using var stream = file.OpenReadStream();
        var result = await _adifService.ImportAdifAsync(stream, skipDuplicates);

        return Ok(new AdifImportResponse(
            result.TotalRecords,
            result.ImportedCount,
            result.SkippedDuplicates,
            result.ErrorCount,
            result.Errors
        ));
    }

    /// <summary>
    /// Export QSOs to ADIF format
    /// </summary>
    [HttpGet("export")]
    [Produces("text/plain")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportAdif(
        [FromQuery] string? callsign = null,
        [FromQuery] string? band = null,
        [FromQuery] string? mode = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var request = new AdifExportRequest(callsign, band, mode, fromDate, toDate);
        var adif = await _adifService.ExportQsosAsync(request);

        var fileName = $"log4ym_export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.adi";

        return File(
            System.Text.Encoding.UTF8.GetBytes(adif),
            "text/plain",
            fileName
        );
    }

    /// <summary>
    /// Export selected QSOs to ADIF format
    /// </summary>
    [HttpPost("export")]
    [Produces("text/plain")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportSelectedQsos([FromBody] AdifExportRequest request)
    {
        var adif = await _adifService.ExportQsosAsync(request);

        var fileName = $"log4ym_export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.adi";

        return File(
            System.Text.Encoding.UTF8.GetBytes(adif),
            "text/plain",
            fileName
        );
    }
}
