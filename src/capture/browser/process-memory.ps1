$ErrorActionPreference='Stop'
try {
 $processIds=[Console]::In.ReadToEnd() | ConvertFrom-Json
 $totalBytes=[long]0;$observed=0
 foreach($processIdValue in $processIds){if($processIdValue -match '^\d+$'){try{$browserProcess=Get-Process -Id ([int]$processIdValue) -ErrorAction Stop;$totalBytes+=$browserProcess.WorkingSet64;$observed++}catch{}}}
 [Console]::Out.Write((@{bytes=$totalBytes;processCount=$observed}|ConvertTo-Json -Compress))
} catch {[Console]::Error.Write('BROWSER_MEMORY_UNAVAILABLE');exit 1}
