Command-Line Interface
The ia command-line tool is installed with internetarchive, or available as a binary. ia allows you to interact with various archive.org services from the command-line.

Getting Started
The easiest way to start using ia is downloading a binary. The only requirements of the binary are a Unix-like environment with Python installed. To download the latest binary, and make it executable simply:

$ curl -LOs https://archive.org/download/ia-pex/ia
$ chmod +x ia
$ ./ia help
A command line interface to archive.org.

usage:
    ia [--help | --version]
    ia [--config-file FILE] [--log | --debug] [--insecure] <command> [<args>]...

options:
    -h, --help
    -v, --version
    -c, --config-file FILE  Use FILE as config file.
    -l, --log               Turn on logging [default: False].
    -d, --debug             Turn on verbose logging [default: False].
    -i, --insecure          Use HTTP for all requests instead of HTTPS [default: false]

commands:
    help      Retrieve help for subcommands.
    configure Configure `ia`.
    metadata  Retrieve and modify metadata for items on archive.org.
    upload    Upload items to archive.org.
    download  Download files from archive.org.
    delete    Delete files from archive.org.
    search    Search archive.org.
    tasks     Retrieve information about your archive.org catalog tasks.
    list      List files in a given item.

See 'ia help <command>' for more information on a specific command.
Metadata
Reading Metadata
You can use ia to read and write metadata from archive.org. To retrieve all of an item’s metadata in JSON, simply:

$ ia metadata TripDown1905
A particularly useful tool to use alongside ia is jq. jq is a command-line tool for parsing JSON. For example:

$ ia metadata TripDown1905 | jq '.metadata.date'
"1906"
Modifying Metadata
Once ia has been configured, you can modify metadata:

$ ia metadata <identifier> --modify="foo:bar" --modify="baz:foooo"
You can remove a metadata field by setting the value of the given field to REMOVE_TAG. For example, to remove the metadata field foo from the item <identifier>:

$ ia metadata <identifier> --modify="foo:REMOVE_TAG"
Note that some metadata fields (e.g. mediatype) cannot be modified, and must instead be set initially on upload.

The default target to write to is metadata. If you would like to write to another target, such as files, you can specify so using the --target parameter. For example, if we had an item whose identifier was my_identifier and we wanted to add a metadata field to a file within the item called foo.txt:

$ ia metadata my_identifier --target="files/foo.txt" --modify="title:My File"
You can also create new targets if they don’t exist:

$ ia metadata <identifier> --target="extra_metadata" --modify="foo:bar"
There is also an --append option which allows you to append a string to an existing metadata strings (Note: use --append-list for appending elements to a list). For example, if your item’s title was Foo and you wanted it to be Foo Bar, you could simply do:

$ ia metadata <identifier> --append="title: Bar"
If you would like to add a new value to an existing field that is an array (like subject or collection), you can use the --append-list option:

$ ia metadata <identifier> --append-list="subject:another subject"
This command would append another subject to the items list of subjects, if it doesn’t already exist (i.e. no duplicate elements are added).

Metadata fields or elements can be removed with the --remove option:

$ ia metadata <identifier> --remove="subject:another subject"
This would remove another subject from the items subject field, regardless of whether or not the field is a single or multi-value field.

Refer to Internet Archive Metadata for more specific details regarding metadata and archive.org.

Modifying Metadata in Bulk
If you have a lot of metadata changes to submit, you can use a CSV spreadsheet to submit many changes with a single command. Your CSV must contain an identifier column, with one item per row. Any other column added will be treated as a metadata field to modify. If no value is provided in a given row for a column, no changes will be submitted. If you would like to specify multiple values for certain fields, an index can be provided: subject[0], subject[1]. Your CSV file should be UTF-8 encoded. See metadata.csv for an example CSV file.

Once you’re ready to submit your changes, you can submit them like so:

$ ia metadata --spreadsheet=metadata.csv
See ia help metadata for more details.

Upload
ia can also be used to upload items to archive.org. After configuring ia, you can upload files like so:

$ ia upload <identifier> file1 file2 --metadata="mediatype:texts" --metadata="blah:arg"
Warning

Please note that, unless specified otherwise, items will be uploaded with a data mediatype. This cannot be changed afterwards. Therefore, you should specify a mediatype when uploading, eg. --metadata="mediatype:movies". Similarly, if you want your upload to end up somewhere else than the default collection (currently community texts), you should also specify a collection with --metadata="collection:foo". See metadata documentation for more information.

You can upload files from stdin:

$ curl http://dumps.wikimedia.org/kywiki/20130927/kywiki-20130927-pages-logging.xml.gz \
  | ia upload <identifier> - --remote-name=kywiki-20130927-pages-logging.xml.gz --metadata="title:Uploaded from stdin."
You can use the --retries parameter to retry on errors (i.e. if IA-S3 is overloaded):

$ ia upload <identifier> file1 --retries 10
Note that ia upload makes a backup of any files that are clobbered. They are saved to a directory in the item named history/files/. The files are named in the format $key.~N~. These files can be deleted like normal files. You can also prevent the backup from happening on clobbers by adding -H x-archive-keep-old-version:0 to your command.

Refer to archive.org Identifiers for more information on creating valid archive.org identifiers. Please also read the Internet Archive Items page before getting started.

Bulk Uploading
Uploading in bulk can be done similarly to Modifying Metadata in Bulk. The only difference is that you must provide a file column which contains a relative or absolute path to your file. Please see uploading.csv for an example.

Once you are ready to start your upload, simply run:

$ ia upload --spreadsheet=uploading.csv
Bulk Uploading Special Columns
You can set a remote filename that differs from your local filename by specifying a remote filename in a column named REMOTE_NAME (Added to ia in v2.0.0).

See ia help upload for more details.

Setting File-Level Metadata on Upload
You can set file-level metadata at time of upload via a JSON/JSONL file. The JSON or JSONL must have a dict for each file, with the local path to the file stored under the key, name. For example, you could upload two files named foo.txt and bar.txt with a file-level title with the following JSONL file (named file_md.jsonl):

{"name": "foo.txt", "title": "my foo file"}
{"name": "bar.txt", "title": "my foo file"}
And the following command:

$ ia upload <id> --file-metadata file_md.jsonl
Download
Download an entire item:

$ ia download TripDown1905
Download specific files from an item:

$ ia download TripDown1905 TripDown1905_512kb.mp4 TripDown1905.ogv
Download specific files matching a glob pattern:

$ ia download TripDown1905 --glob="*.mp4"
Note that you may have to escape the * differently depending on your shell (e.g. \*.mp4, '*.mp4', etc.).

Download specific files matching a glob pattern, but excluding files matching a different glob pattern:

$ ia download TripDown1905 --glob="*.mp4" --exclude "*512kb*"
Note that --exclude can only be used in conjunction with --glob.

Download only files of a specific format:

$ ia download TripDown1905 --format='512Kb MPEG4'
Note that --format cannot be used with --glob or --exclude. You can get a list of the formats of a given item like so:

$ ia metadata --formats TripDown1905
Download an entire collection:

$ ia download --search 'collection:glasgowschoolofart'
Download from an itemlist:

$ ia download --itemlist itemlist.txt
See ia help download for more details.

Downloading On-The-Fly Files
Some files on archive.org are generated on-the-fly as requested. This currently includes non-original files of the formats EPUB, MOBI, DAISY, and archive.org’s own MARCXML. These files can be downloaded using the --on-the-fly parameter:

$ ia download goodytwoshoes00newyiala --on-the-fly
Delete
You can use ia to delete files from archive.org items:

$ ia delete <identifier> <file>
Delete all files associated with the specified file, including upstream derivatives and the original:

$ ia delete <identifier> <file> --cascade
Delete all files in an item:

$ ia delete <identifier> --all
Note that ia delete makes a backup of any files that are deleted. They are saved to a directory in the item named history/files/. The files are named in the format $key.~N~. These files can be deleted like normal files. You can also prevent the backup from happening on deletes by adding -H x-archive-keep-old-version:0 to your command.

See ia help delete for more details.

Search
ia can also be used for retrieving archive.org search results in JSON:

$ ia search 'subject:"market street" collection:prelinger'
By default, ia search attempts to return all items meeting the search criteria, and the results are sorted by item identifier. If you want to just select the top n items, you can specify a page and rows parameter. For example, to get the top 20 items matching the search ‘dogs’:

$ ia search --parameters="page=1&rows=20" "dogs"
You can use ia search to create an itemlist:

$ ia search 'collection:glasgowschoolofart' --itemlist > itemlist.txt
You can pipe your itemlist into a GNU Parallel command to download items concurrently:

$ ia search 'collection:glasgowschoolofart' --itemlist | parallel 'ia download {}'
See ia help search for more details.

Tasks
You can also use ia to retrieve information about your catalog tasks, after configuring ia. To retrieve the task history for an item, simply run:

$ ia tasks <identifier>
View all of your queued and running archive.org tasks:

$ ia tasks
See ia help tasks for more details.

List
You can list files in an item like so:

$ ia list goodytwoshoes00newyiala
See ia help list for more details.

Copy
You can copy files in archive.org items like so:

$ ia copy <src-identifier>/<src-filename> <dest-identifier>/<dest-filename>
If you’re copying your file to a new item, you can provide metadata as well:

$ ia copy <src-identifier>/<src-filename> <dest-identifier>/<dest-filename> --metadata 'title:My New Item' --metadata collection:test_collection
Note that ia copy makes a backup of any files that are clobbered. They are saved to a directory in the item named history/files/. The files are named in the format $key.~N~. These files can be deleted like normal files. You can also prevent the backup from happening on clobbers by adding -H x-archive-keep-old-version:0 to your command.

Move
ia move works just like ia copy except the source file is deleted after the file has been successfully copied.

Note that ia move makes a backup of any files that are clobbered or deleted. They are saved to a directory in the item named history/files/. The files are named in the format $key.~N~. These files can be deleted like normal files. You can also prevent the backup from happening on clobbers or deletes by adding -H x-archive-keep-old-version:0 to your command.

