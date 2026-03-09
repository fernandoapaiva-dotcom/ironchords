# Read file with correct encoding
$path = "frontend\src\App.jsx"
$lines = [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)

Write-Host "Total lines: $($lines.Length)"

# Lines are 0-indexed in array but 1-indexed in viewer
# Delete Modal: lines 4251-4280 (0-indexed: 4250-4279)
# Save Modal: lines 4282-4344 (0-indexed: 4281-4343)
# Rename Modal: lines 4674-4729 (0-indexed: 4673-4728)

# Extract the blocks (as strings joined by newline)
$deleteModalLines = $lines[4250..4279]
$saveModalLines = $lines[4281..4343]
$renameModalLines = $lines[4673..4728]

Write-Host "Delete modal first line: $($deleteModalLines[0])"
Write-Host "Save modal first line: $($saveModalLines[0])"
Write-Host "Rename modal first line: $($renameModalLines[0])"

# Replace the extracted blocks with null in original lines
for ($i = 4250; $i -le 4279; $i++) { $lines[$i] = "" }
$lines[4250] = "                                                    {/* Delete Confirmation Modal */}"
$lines[4251] = "                                                    null"

for ($i = 4281; $i -le 4343; $i++) { $lines[$i] = "" }
$lines[4281] = "                                                    {/* Save List Modal */}"
$lines[4282] = "                                                    null"

for ($i = 4673; $i -le 4728; $i++) { $lines[$i] = "" }
$lines[4673] = "                                                    {/* Rename List Modal */}"
$lines[4674] = "                                                    null"

# Find the injection point (Share and Import Modals comment)
$injectionIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "Share and Import Modals") {
        $injectionIdx = $i
        break
    }
}

Write-Host "Injection point at line: $($injectionIdx + 1)"

# Build the injected content
$deleteModalStr = $deleteModalLines -join "`r`n"
$saveModalStr = $saveModalLines -join "`r`n"
$renameModalStr = $renameModalLines -join "`r`n"

# Insert BEFORE the injection point
$newLines = @()
$newLines += $lines[0..($injectionIdx-1)]
$newLines += ""
$newLines += "            {/* Extracted Root Modals */}"
$newLines += $deleteModalLines
$newLines += ""
$newLines += $saveModalLines
$newLines += ""
$newLines += $renameModalLines
$newLines += ""
$newLines += $lines[$injectionIdx..($lines.Length-1)]

[System.IO.File]::WriteAllLines($path, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "Done! Total new lines: $($newLines.Length)"
