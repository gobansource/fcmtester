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
