#!/bin/bash

rsync --copy-dirlinks --copy-links --delete --links --safe-links --keep-dirlinks --recursive --times --itemize-changes --human-readable --human-readable --cvs-exclude --exclude-from=/Users/oliver/.rsyncexclude /Users/oliver/Sites/legislature/ whyte@fl-58026.rocq.inria.fr:www/legislature/
