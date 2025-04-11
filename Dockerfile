# Build backend
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:9.0-noble AS backend-build
ARG COMMIT_SHA=unknown
WORKDIR /app/backend
COPY backend/*.csproj ./
RUN dotnet restore
COPY backend/ ./
# Frontend assets should be built in the workflow and available here
COPY backend/wwwroot ./wwwroot
RUN dotnet publish -c Release -o out /p:GitCommit=$COMMIT_SHA

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-noble-chiseled
WORKDIR /app
COPY --from=backend-build /app/backend/out ./
EXPOSE 8080
ENTRYPOINT ["dotnet", "FcmTester.Api.dll"]

LABEL org.opencontainers.image.source=https://github.com/gobansource/fcmtester
LABEL org.opencontainers.image.description="FCM Data Only Messages, Push Notifications Tester"
LABEL org.opencontainers.image.url=https://fcmtester.com
LABEL org.opencontainers.image.documentation=https://github.com/gobansource/fcmtester/blob/main/README.md
LABEL org.opencontainers.image.vendor="Goban Source - https://gobansource.com"
LABEL org.opencontainers.image.licenses=MIT
LABEL org.opencontainers.image.authors="Goban Source <hello@gobansource.com>"
LABEL org.opencontainers.image.title="FCM Data Only Messages, Push Notifications Tester"

