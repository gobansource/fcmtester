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

// Add these helper methods before the app.MapPost endpoint
ApnsConfig CreateBackgroundApnsConfig(string bundleId)
{
    return new ApnsConfig()
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
}

ApnsConfig CreateAlertApnsConfig(string bundleId)
{
    return new ApnsConfig()
    {
        Headers = new Dictionary<string, string>()
        {
            { "apns-priority", "10" },
            { "apns-push-type", "alert" },
            { "apns-token", bundleId }
        }
    };
}

app.MapPost("/api/send-fcm", async (HttpRequest request, ILogger<Program> logger) =>
{
    logger.LogInformation("Processing FCM send request");

    var form = await request.ReadFormAsync();
    var privateKeyFile = form.Files.GetFile("privateKeyFile");
    var deviceToken = form["deviceToken"];
    var message = form["message"];
    var data = form["data"].FirstOrDefault();
    var bundleId = form["bundleId"].FirstOrDefault();
    var notificationTitle = form["notificationTitle"].FirstOrDefault();

    if (privateKeyFile == null || string.IsNullOrEmpty(deviceToken))
    {
        logger.LogWarning("Missing required fields in FCM request");
        return Results.BadRequest("Missing required fields");
    }

    FirebaseApp app = null;
    try
    {
        using var stream = privateKeyFile.OpenReadStream();
        var credential = GoogleCredential.FromStream(stream)
            .CreateScoped("https://www.googleapis.com/auth/firebase.messaging");

        // Create a unique name for this Firebase instance
        var instanceId = Guid.NewGuid().ToString();
        app = FirebaseApp.Create(new AppOptions
        {
            Credential = credential
        }, instanceId);

        // Get FirebaseMessaging instance for this specific app
        var messaging = FirebaseMessaging.GetMessaging(app);

        var fcmMessage = new Message()
        {
            Token = deviceToken
        };

        // Determine which case we're handling
        bool hasMessage = !string.IsNullOrEmpty(message);
        bool hasData = !string.IsNullOrEmpty(data);

        // Set notification if message exists (Cases 1 & 3)
        if (hasMessage)
        {
            fcmMessage.Notification = new Notification()
            {
                Title = notificationTitle,
                Body = message
            };

        }
        if (hasData)
        {
            try
            {
                var dataDict = JsonSerializer.Deserialize<Dictionary<string, string>>(data);
                fcmMessage.Data = dataDict;

            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Error parsing data JSON");
                return Results.BadRequest("Invalid data JSON format");
            }
        }
        if (hasMessage)
        {
            fcmMessage.Apns = CreateAlertApnsConfig(bundleId);
        }
        else if (hasData)
        {
            fcmMessage.Apns = CreateBackgroundApnsConfig(bundleId);
        }

        var response = await messaging.SendAsync(fcmMessage);
        logger.LogInformation($"FCM message sent successfully. Message ID: {response}");

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var serializedMessage = JsonSerializer.Serialize(fcmMessage, options);


        return Results.Ok(new
        {
            success = true,
            messageId = response,
            message = JsonSerializer.Deserialize<object>(serializedMessage)
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error sending FCM message");
        return Results.BadRequest(new { success = false, error = ex.Message });
    }
    finally
    {
        // Clean up the Firebase instance
        if (app != null)
        {
            app.Delete();
            logger.LogInformation($"Cleaned up Firebase instance");
        }
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
