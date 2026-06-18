namespace ColdStorageForklift.Api.BackgroundServices;

using ColdStorageForklift.Api.Hubs;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

public class RiskPredictionBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RiskPredictionBackgroundService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromSeconds(5);

    public RiskPredictionBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<RiskPredictionBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Risk Prediction Background Service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var predictionService = scope.ServiceProvider.GetRequiredService<IRiskPredictionService>();
                var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<MonitoringHub>>();

                var predictions = await predictionService.CalculatePredictionsAsync();

                foreach (var result in predictions.Where(p => p.RiskLevel >= Core.Entities.RiskLevel.Medium))
                {
                    var warning = await predictionService.GeneratePredictionWarningAsync(result);
                    if (warning != null)
                    {
                        await hubContext.Clients.Group("monitoring")
                            .SendAsync("PredictionWarningGenerated", new
                            {
                                id = warning.Id,
                                forkliftId = warning.ForkliftId,
                                personnelId = warning.PersonnelId,
                                warningType = warning.WarningType,
                                predictedRiskLevel = warning.PredictedRiskLevel,
                                predictedDistance = warning.PredictedDistance,
                                forkliftPositionX = warning.ForkliftPositionX,
                                forkliftPositionY = warning.ForkliftPositionY,
                                forkliftSpeed = warning.ForkliftSpeed,
                                forkliftDirection = warning.ForkliftDirection,
                                personnelPositionX = warning.PersonnelPositionX,
                                personnelPositionY = warning.PersonnelPositionY,
                                predictedCollisionTime = warning.PredictedCollisionTime,
                                message = warning.Message,
                                status = warning.Status,
                                createdAt = warning.CreatedAt,
                                expiresAt = warning.ExpiresAt
                            });
                    }
                }

                await predictionService.ExpireOldPredictionsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while calculating risk predictions.");
            }

            await Task.Delay(_interval, stoppingToken);
        }

        _logger.LogInformation("Risk Prediction Background Service stopped.");
    }
}
