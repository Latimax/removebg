<?php
// Utility: structured JSON response
function respond($status, $msg, $extra = []) {
    header('Content-Type: application/json');
    echo json_encode(array_merge([
        'status' => $status,
        'msg'    => $msg
    ], $extra));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond('error', 'Invalid request method.');
}

$action = $_POST['action'] ?? '';
if ($action !== 'remove_bg') {
    respond('error', 'Unknown action.');
}

// Validate file
if (!isset($_FILES['compress']) || $_FILES['compress']['error'] !== UPLOAD_ERR_OK) {
    respond('error', 'No image uploaded or upload failed.');
}

$f = $_FILES['compress'];
$mime = mime_content_type($f['tmp_name']);
$allowed = ['image/png','image/jpeg'];
if (!in_array($mime, $allowed, true)) {
    respond('error', 'Unsupported file type. Please upload PNG or JPG.');
}

// Basic size guard (3MB client-side, but double-check server-side)
if (filesize($f['tmp_name']) > 3 * 1024 * 1024) {
    respond('error', 'Image is too large (max 3MB).');
}

// Build python command in a cross-platform way
$python = DIRECTORY_SEPARATOR === '\\'
    ? __DIR__ . DIRECTORY_SEPARATOR . 'venv' . DIRECTORY_SEPARATOR . 'Scripts' . DIRECTORY_SEPARATOR . 'python'
    : __DIR__ . DIRECTORY_SEPARATOR . 'venv' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'python';

$pyfile = __DIR__ . DIRECTORY_SEPARATOR . 'process.py';

if (!file_exists($python)) {
    // Fallback to system python if venv python is missing
    $python = 'python';
}

$cmd = escapeshellcmd($python) . ' ' . escapeshellarg($pyfile) . ' ' . escapeshellarg($f['tmp_name']) . ' 2>&1';

$start = microtime(true);
$execute = shell_exec($cmd);
$duration = round((microtime(true) - $start) * 1000);

// If Python prints False (our error sentinel), treat as failure
if (!$execute || trim($execute) === '' || trim($execute) === 'False') {
    respond('error', 'Processing failed. Try another image or a smaller one.', [
        'duration_ms' => $duration
    ]);
}

respond('success', 'Background removed.', [
    'output' => 'data:image/png;base64,' . trim($execute),
    'duration_ms' => $duration
]);
?>