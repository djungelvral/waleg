<?php
// Set your return content type
header('Content-type: text/html');

// Website url to open
$daurl = $_GET["url"];
$testurl = "http://listserv.wa.gov/cgi-bin/wa";

if(substr($daurl, 0, strlen($testurl))===$testurl) {
    // Get that website's content
    $handle = fopen($daurl, "r");
    // If there is something, read and return
    if ($handle) {
        while (!feof($handle)) {
            $buffer = fgets($handle, 4096);
            echo $buffer;
        }
        fclose($handle);
    }
} else {
    echo "Invalid URL: must begin with ".$testurl;
}
?>
