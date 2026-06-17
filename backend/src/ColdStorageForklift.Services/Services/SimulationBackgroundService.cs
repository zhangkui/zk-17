namespace ColdStorageForklift.Services;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

public class SimulationBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SimulationBackgroundService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromSeconds(3);

    public SimulationBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<SimulationBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Simulation Background Service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var simulationService = scope.ServiceProvider.GetRequiredService<ISimulationService>();
                await simulationService.GenerateSimulationDataAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while generating simulation data.");
            }

            await Task.Delay(_interval, stoppingToken);
        }

        _logger.LogInformation("Simulation Background Service stopped.");
    }
}
