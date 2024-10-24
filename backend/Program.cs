using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors();

// Add logging services
builder.Services.AddLogging();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseCors(builder => builder
            .WithOrigins("http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader());
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Serve static files and use default files
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapPost("/api/send-fcm", async (HttpRequest request, ILogger<Program> logger) =>
{
    logger.LogInformation("Processing FCM send request");

    var form = await request.ReadFormAsync();
    var privateKeyFile = form.Files.GetFile("privateKeyFile");
    var deviceToken = form["deviceToken"];
    var message = form["message"];
    var data = form["data"].FirstOrDefault();
    var bundleId = form["bundleId"].FirstOrDefault() ?? "";

    if (privateKeyFile == null || string.IsNullOrEmpty(deviceToken))
    {
        logger.LogWarning("Missing required fields in FCM request");
        return Results.BadRequest("Missing required fields");
    }

    try
    {
        using var stream = privateKeyFile.OpenReadStream();
        var credential = GoogleCredential.FromStream(stream)
            .CreateScoped("https://www.googleapis.com/auth/firebase.messaging");

        var firebaseApp = FirebaseApp.Create(new AppOptions { Credential = credential });

        var fcmMessage = new Message()
        {
            Token = deviceToken
        };

        if (!string.IsNullOrEmpty(message))
        {
            fcmMessage.Notification = new Notification()
            {
                Title = "FCM Test Message",
                Body = message
            };
        }

        var apns = new ApnsConfig()
        {
            Aps = new Aps()
            {
                ContentAvailable = true,
            },
            Headers = new Dictionary<string, string>()
            {
                { "apns-priority", "5" },
                { "apns-push-type", "background" },
                { "apns-token", bundleId }
            }
        };

        if (!string.IsNullOrEmpty(data))
        {
            try
            {
                var dataDict = JsonSerializer.Deserialize<Dictionary<string, string>>(data);
                fcmMessage.Data = dataDict;
                fcmMessage.Apns = apns;
            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Error parsing data JSON");
                return Results.BadRequest("Invalid data JSON format");
            }
        }

        var response = await FirebaseMessaging.DefaultInstance.SendAsync(fcmMessage);
        logger.LogInformation($"FCM message sent successfully. Message ID: {response}");

        // Serialize the entire FCM message
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var serializedMessage = JsonSerializer.Serialize(fcmMessage, options);
        logger.LogInformation(serializedMessage);
        return Results.Ok(new
        {
            success = true,
            messageId = response,
            message = JsonSerializer.Deserialize<object>(serializedMessage) // Deserialize to clean up the format
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error sending FCM message");
        return Results.BadRequest(new { success = false, error = ex.Message });
    }
    finally
    {
        FirebaseApp.DefaultInstance?.Delete();
    }
})
.WithName("SendFcm")
.WithOpenApi();

// Fallback route for SPA
app.MapFallbackToFile("index.html");

var assembly = Assembly.GetEntryAssembly();
var informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>().InformationalVersion;
app.Logger.LogInformation("Application starting. Version: {Version}", informationalVersion);

app.Run();
