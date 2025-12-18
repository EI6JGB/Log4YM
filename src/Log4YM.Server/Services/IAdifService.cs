using Log4YM.Contracts.Api;
using Log4YM.Contracts.Models;

namespace Log4YM.Server.Services;

public interface IAdifService
{
    /// <summary>
    /// Parse an ADIF file content and return QSO records
    /// </summary>
    IEnumerable<Qso> ParseAdif(string adifContent);

    /// <summary>
    /// Parse an ADIF file stream and return QSO records
    /// </summary>
    IEnumerable<Qso> ParseAdif(Stream stream);

    /// <summary>
    /// Export QSOs to ADIF format
    /// </summary>
    string ExportToAdif(IEnumerable<Qso> qsos, string? stationCallsign = null);

    /// <summary>
    /// Import ADIF file and save to database
    /// </summary>
    Task<AdifImportResult> ImportAdifAsync(Stream stream, bool skipDuplicates = true);

    /// <summary>
    /// Export QSOs from database to ADIF format
    /// </summary>
    Task<string> ExportQsosAsync(AdifExportRequest? request = null);
}

public record AdifImportResult(
    int TotalRecords,
    int ImportedCount,
    int SkippedDuplicates,
    int ErrorCount,
    IEnumerable<string> Errors
);
