$root = "C:\Users\18878\Desktop\BalatroAssetViewer"
$chrome = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
$v = "$root\.work\verify"
$states = @('codex','detail','tarot','cards','forge','forgeEdition','atlas','hands','data','search')
foreach ($s in $states) {
  $a = @('--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-sync',
    "--user-data-dir=$root\.work\chromeprofile",'--allow-file-access-from-files','--disable-crash-reporter',
    '--virtual-time-budget=30000','--window-size=1720,1150',
    "--screenshot=$v\shot-$s.png",'--dump-dom',
    "file:///C:/Users/18878/Desktop/BalatroAssetViewer/.work/verify/v-$s.html")
  $p = Start-Process -FilePath $chrome -ArgumentList $a -PassThru -Wait -NoNewWindow `
    -RedirectStandardOutput "$v\dom-$s.html" -RedirectStandardError "$v\err-$s.txt"
  node "$v\report.js" "$s"
}
"DONE"
