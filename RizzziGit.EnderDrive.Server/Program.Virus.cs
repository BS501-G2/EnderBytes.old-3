using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace RizzziGit.EnderDrive.Server;

using ClamAV.Net.Client.Results;
using Core;
using Services;

public static partial class Program
{
    public static async Task ScanVirus(Server server)
    {
        VirusScanner scanner = server.Scanner;

        // FileStream stream = File.OpenRead()

        ScanResult scanResult = await scanner.Scan(
            new MemoryStream(
                Encoding.UTF8.GetBytes(
                    "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
                )
            )
        );

        if (scanResult.Infected)
        {
            Console.WriteLine("asd");
        }
    }
}
