using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Data;
using ColdStorageForklift.Infrastructure.Repositories;
using ColdStorageForklift.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

builder.Services.AddScoped<IZoneService, ZoneService>();
builder.Services.AddScoped<IPositionService, PositionService>();
builder.Services.AddScoped<IBlindSpotService, BlindSpotService>();
builder.Services.AddScoped<ICollisionWarningService, CollisionWarningService>();
builder.Services.AddScoped<IEventReplayService, EventReplayService>();
builder.Services.AddScoped<ITeamService, TeamService>();
builder.Services.AddScoped<IForkliftService, ForkliftService>();
builder.Services.AddScoped<IPersonnelService, PersonnelService>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();

builder.Services.AddSingleton<IRabbitMqService>(sp =>
{
    var config = builder.Configuration;
    return new RabbitMqService(
        config["RabbitMQ:HostName"] ?? "localhost",
        config["RabbitMQ:UserName"] ?? "guest",
        config["RabbitMQ:Password"] ?? "guest");
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var retryCount = 0;
    var maxRetries = 10;
    while (retryCount < maxRetries)
    {
        try
        {
            db.Database.EnsureCreated();
            break;
        }
        catch (Exception)
        {
            retryCount++;
            if (retryCount >= maxRetries) throw;
            Console.WriteLine($"Database connection failed, retrying in 5 seconds... (attempt {retryCount}/{maxRetries})");
            System.Threading.Thread.Sleep(5000);
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseRouting();
app.MapControllers();
app.MapHub<ColdStorageForklift.Api.Hubs.MonitoringHub>("/hubs/monitoring");

app.Run();
