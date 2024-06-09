rule nginx : test
{
meta:
	sample_filetype = "html"
strings:
	$s0 = /Welcome to nginx!/ nocase
condition:
	any of them
}

rule ErrorPage : test
{
meta:
	sample_filetype = "html"
strings:
	$s0 = /a padding to disable MSIE and Chrome friendly error page/ nocase
condition:
	any of them
}