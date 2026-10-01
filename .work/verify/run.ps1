param([string]$State = 'codex')
$root = "C:\Users\18878\Desktop\BalatroAssetViewer"
$chrome = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
$v = "$root\.work\verify"
$args = @('--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-sync',
  "--user-data-dir=$root\.work\chromeprofile",'--allow-file-access-from-files','--disable-crash-reporter',
  '--virtual-time-budget=30000','--window-size=1720,1150',
  "--screenshot=$v\shot-$State.png")
if ($State -eq 'dump') {
  $args += '--dump-dom'
  $args += "file:///C:/Users/18878/Desktop/BalatroAssetViewer/Balatro%E7%B4%A0%E6%9D%90%E5%9B%BE%E9%89%B4.html"
} else {
  $args += "file:///C:/Users/18878/Desktop/BalatroAssetViewer/.work/verify/v-$State.html"
}
$p = Start-Process -FilePath $chrome -ArgumentList $args -PassThru -Wait -NoNewWindow `
  -RedirectStandardOutput "$v\dom-$State.html" -RedirectStandardError "$v\err-$State.txt"
"$State exit=$($p.ExitCode)"
node "$v\report.js" "$State"
