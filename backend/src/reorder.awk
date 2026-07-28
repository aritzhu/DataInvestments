BEGIN { block1=""; block2=""; added=0; }
{
    if (NR == 1) { getline; } # skip empty line? ; (actually we need to handle correctly)
}
# Instead simpler: read all lines into arrays; but given memory, just sequentially process.
# We'll just rewrite by skipping ranges.
{
    if (NR >= 573 && NR <= 593) { next; }
    if (NR >= 595 && NR <= 615) { next; }
    if (added == 0 && NR == 128) {
        # Output block1
        system("sed -n '573,593p' server.ts > /tmp/block1.tmp 2>/dev/null");
        system("sed -n '595,615p' server.ts > /tmp/block2.tmp 2>/dev/null");
        while ((getline line < "/tmp/block1.tmp") > 0) print line;
        close("/tmp/block1.tmp");
        while ((getline line < "/tmp/block2.tmp") > 0) print line;
        close("/tmp/block2.tmp");
        added = 1;
    }
    print;
}
