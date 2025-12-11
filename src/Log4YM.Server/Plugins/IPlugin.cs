namespace Log4YM.Server.Plugins;

public interface IPlugin
{
    string Id { get; }
    string Name { get; }
    string Version { get; }
    string Description { get; }

    void ConfigureServices(IServiceCollection services);
    void ConfigureApp(WebApplication app);
}

public abstract class PluginBase : IPlugin
{
    public abstract string Id { get; }
    public abstract string Name { get; }
    public abstract string Version { get; }
    public abstract string Description { get; }

    public virtual void ConfigureServices(IServiceCollection services) { }
    public virtual void ConfigureApp(WebApplication app) { }
}
