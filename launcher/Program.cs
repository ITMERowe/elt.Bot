using System.Diagnostics;

const int port = 4173;
var projectRoot = FindProjectRoot();
if (projectRoot is null)
{
    Console.Error.WriteLine("Could not find the eltBot project folder.");
    return 1;
}

var gui = Process.Start(new ProcessStartInfo
{
    FileName = "cmd.exe",
    Arguments = "/k node node_modules\\ts-node\\dist\\bin.js src/guiServer.ts",
    WorkingDirectory = projectRoot,
    UseShellExecute = false,
    CreateNoWindow = false
});

if (gui is null)
{
    Console.Error.WriteLine("Could not start the GUI.");
    return 1;
}

using var http = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}") };
for (var attempt = 0; attempt < 30; attempt++)
{
    try
    {
        using var response = await http.GetAsync("/api/status");
        if (response.IsSuccessStatusCode)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = $"http://127.0.0.1:{port}",
                UseShellExecute = true
            });
            gui.WaitForExit();
            return gui.ExitCode;
        }
    }
    catch (HttpRequestException)
    {
        // The GUI needs a moment to start listening.
    }

    await Task.Delay(500);
}

Console.Error.WriteLine("The GUI did not start in time.");
return 1;

static string? FindProjectRoot()
{
    var directory = new DirectoryInfo(AppContext.BaseDirectory);
    while (directory is not null)
    {
        if (File.Exists(Path.Combine(directory.FullName, "package.json")) &&
            Directory.Exists(Path.Combine(directory.FullName, "src")))
        {
            return directory.FullName;
        }

        directory = directory.Parent;
    }

    return null;
}