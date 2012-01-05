#!/usr/bin/perl

my $email_txt;
{ local $/ = undef; local *FILE; open FILE, "<tmp.txt"; $email_txt = <FILE>; close FILE }

my @email_lines = split(/(?=.*\n[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{1,2})/, $email_txt);

for (@email_lines) {
    # print "Record ==========================\n".$_."\n";
    # Remove trailing lines we don't want
    s/^\s*$//;
    s/^Back to Top//;
    s/^----------------//;
    m/(.*)\n([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{1,2})\s+([0-9]{1,2}:[0-9]{1,2}\s*[ap]m)\n\*(S|H|J)/;
    print "Title: ".$1."\n";
    print "Date: ".$2."\n";
    print "Time: ".$3."\n";
    print "Details: ".$4."\n";
}