using Serilog;
using Log4YM.Server.Core.Database;
using Log4YM.Server.Core.Events;
using Log4YM.Server.Hubs;
using Log4YM.Server.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Log4YM API", Version = "v1" });
});

// Add SignalR
builder.Services.AddSignalR();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",  // Vite dev server
                "http://localhost:5000",
                "http://localhost:3000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Register MongoDB context
builder.Services.AddSingleton<MongoDbContext>();

// Register repositories
builder.Services.AddScoped<IQsoRepository, QsoRepository>();
builder.Services.AddScoped<ISpotRepository, SpotRepository>();

// Register event bus
builder.Services.AddSingleton<IEventBus, EventBus>();

var app = builder.Build();

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Serve static files (React build)
app.UseDefaultFiles();
app.UseStaticFiles();

// Map API endpoints
app.MapQsoEndpoints();
app.MapSpotEndpoints();

// Map SignalR hub
app.MapHub<LogHub>("/hubs/log");

// Health check
app.MapGet("/api/health", () => new { Status = "Healthy", Timestamp = DateTime.UtcNow })
    .WithName("HealthCheck")
    .WithTags("System");

// Plugin info endpoint
app.MapGet("/api/plugins", () => new[]
{
    new { Id = "cluster", Name = "DX Cluster", Version = "1.0.0", Enabled = true },
    new { Id = "log-entry", Name = "Log Entry", Version = "1.0.0", Enabled = true },
    new { Id = "log-history", Name = "Log History", Version = "1.0.0", Enabled = true },
    new { Id = "map-globe", Name = "Map/Globe", Version = "1.0.0", Enabled = true }
}).WithName("GetPlugins").WithTags("System");

// Fallback to index.html for SPA routing
app.MapFallbackToFile("index.html");

Log.Information("Log4YM Server starting on {Urls}", string.Join(", ", app.Urls));

app.Run();
