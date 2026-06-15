namespace ColdStorageForklift.Services;

using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

public interface IRabbitMqService : IDisposable
{
    Task PublishWarningAsync(string message);
    Task PublishPositionUpdateAsync(string message);
    void StartConsumingPositionUpdates(Func<string, Task> onMessageReceived);
}

public class RabbitMqService : IRabbitMqService
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private bool _disposed;

    public RabbitMqService(string hostName, string userName, string password)
    {
        var factory = new ConnectionFactory
        {
            HostName = hostName,
            UserName = userName,
            Password = password
        };
        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();

        _channel.ExchangeDeclare("cold_storage_warnings", ExchangeType.Fanout, durable: true);
        _channel.QueueDeclare("warning_queue", durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind("warning_queue", "cold_storage_warnings", "");

        _channel.ExchangeDeclare("cold_storage_positions", ExchangeType.Fanout, durable: true);
        _channel.QueueDeclare("position_queue", durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind("position_queue", "cold_storage_positions", "");
    }

    public async Task PublishWarningAsync(string message)
    {
        var body = Encoding.UTF8.GetBytes(message);
        _channel.BasicPublish(exchange: "cold_storage_warnings", routingKey: "", body: body);
        await Task.CompletedTask;
    }

    public async Task PublishPositionUpdateAsync(string message)
    {
        var body = Encoding.UTF8.GetBytes(message);
        _channel.BasicPublish(exchange: "cold_storage_positions", routingKey: "", body: body);
        await Task.CompletedTask;
    }

    public void StartConsumingPositionUpdates(Func<string, Task> onMessageReceived)
    {
        var consumer = new EventingBasicConsumer(_channel);
        consumer.Received += async (model, ea) =>
        {
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);
            await onMessageReceived(message);
        };
        _channel.BasicConsume(queue: "position_queue", autoAck: true, consumer: consumer);
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _channel?.Close();
            _channel?.Dispose();
            _connection?.Close();
            _connection?.Dispose();
            _disposed = true;
        }
    }
}
