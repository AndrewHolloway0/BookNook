Automation is a key part of any IT space. Lately, my job has required me to setup multiple computers - each on different days but with identical apps and configuration. The repetition quickly got quite tiresome and tedious, so I've decided to automate the process, however, what I _didn’t_ anticipate was just how many grey hairs I’d earn along the way.

## Starting Easy and Getting Side-Tracked
Let's start with something critical to the functionality: installing applications. A brief research session lead me to [Chocolatey](https://community.chocolatey.org/) - a package manager for Windows that can **easily** be scripted, gracefully handles failures, and appears to include all the apps that I want to install. Sounds perfect! After running some tests, I found that it really is just as easy as I thought. Here's what went smoothly:
- Application installation.
- Script elevation.
- Sleep settings.
- Taskbar alignment.

With the basics working, I _should_ have continued building the core functionality. Instead, I got side-tracked with quality-of-life (QOL) features - classic. I started by adding a feature to let users choose which applications to install when running the script, then expanded it to support script parameters. Eventually, I incorporated custom app collections for automatic deployment. I have to admit, I’m proud of that—I’d never done it before, and learning how it worked was genuinely fun.

## Trouble Brewing
Now that the applications are now installed, I wanted to automate the task of setting default applications. I already knew that Windows protects a few files extensions from being set by applications, such as `.html`, `.pdf`, `.eml`, which are quite literally all the ones I want to set and change.

I thought since I've seen Adobe Reader prompt the user to set the PDF default, maybe I could do the exact same thing, so I started there. My research lead to me various areas, like registry editing the local user, group policy, manually opening settings (thanks ChatGPT), all of which didn't work the way I wanted to. GPOs are largely ignored by Windows these days, you can't reliably edit the local user registry because [[technically it doesn't exist]], and I didn't want a solution that *might* work, I wanted one that *does* work reliably across Windows 10 and 11. 

The closest solution I found was the 'Open With' prompt.

```cmd
rundll32.exe shell32.dll,OpenAs_RunDLL .pdf
```

This was so close to what I wanted, but it never prompted me to 'Set Default'. This is the point my hair started to go grey, and I'm only 23. I was so laser-focused on automating default application settings that I didn’t even notice I’d entered the first stage of grief: denial. It had to be possible - Adobe Reader does it!

## Reverse Engineering
"Okay, lets go to Adobe and download Reader. It *always* prompts me at the end to set default apps." My plan was to use a few [Sysinternals Suite](https://learn.microsoft.com/en-us/sysinternals/) programs called [Process Monitor](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon), [Process Explorer](https://learn.microsoft.com/en-us/sysinternals/downloads/process-explorer) and [ListDLLs](https://learn.microsoft.com/en-us/sysinternals/downloads/listdlls) to find out which exact DLL and function Adobe Reader was calling to initiate the built in Windows "Set Default" popup. Based on my previous findings I was surely on the right track to finding it. Maybe there's an alternate function I can call in the shell32.dll that will do what I need.

After setting up a virtual environment to run my scripts in, I downloaded Adobe Reader and started monitoring what Adobe Reader is doing. Frustratingly, it turns out that Adobe randomly provides different installers, and not all of them attempt to set the default application. (At this point, my frustration was growing.) Eventually got the correct version, and found that yes, it is calling shell32.dll, alongside user32.dll. I found a few resources such as [Geoff Chappell's website](https://www.geoffchappell.com/studies/windows/shell/shell32/api/index.htm), which was extremely helpful in establishing that there is no simple "SetDefaultApp" function.
### Research Outcome
I eventually found which function Adobe Reader was calling and also realised that Adobe Reader is an `.exe`, not a `.ps1` or `.bat`, which means it's likely initiating a function that isn't exposed as a DLL or something similar that I can invoke from my script. Turns out, this is correct. ChatGPT assisted me with this revelation.

ChatGPT: Since `LaunchAdvancedAssociationUI` is a COM method, you **must** call it programmatically. More information can be found [here](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl/nf-shobjidl-iapplicationassociationregistrationui-launchadvancedassociationui).

Do I *really* want to learn C++ or C# just to make an exe that can set default applications? No. Based on this information, simply launching the settings page for setting default applications is sufficient. After all, it only takes 20-30 seconds anyway.

## Moving On
That's it - I'm done. After spending an entire week on just the troubleshooting alone, I could *feel* my soul preparing for a system shutdown. So, I started focusing on documentation: writing the public README file for GitHub, adding commenting the code, and separating functions out for profile setup and initial application installs. Now it's easier to choose what you want to do upon install. I also improved script outputs to ensure the user knows where the process is up to.

## Reflection & Defeat
What I thought was a simple automation project, quickly turned into a deep dive into Windows internals, undocumented functions, and a lot of frustration. While I didn’t achieve full automation in setting default apps, I learned a lot along the way; like knowing when to stop before spiralling into insanity (not!). I realise that sometimes, good enough is good enough, and it is *just* easier to manually click a button.

---
### TLDR - Too Long, Didn't Read
I set out to automate the Windows Setup process. While initial work proved successful, with application installation, sleep settings, automatic script elevation, and a few quality of life features, I didn't anticipate spending multiple hours growing grey hairs just at an attempt at simply setting default applications automatically, which revealed that just clicking a button manually was much simpler. The script did eventually get finished, and you can find it [here](https://github.com/AndrewHolloway0/SetupWindows).