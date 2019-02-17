$(document).ready(
    function(){
            /*

            $('#job_table').DataTable({"order":[0, 'desc']});
            var list = [{% for m in matched %}"{{m}}",{% endfor %}];
            $.each(list, function(index, value){
                v = $("<div/>").html(value).text();
                $("pre").highlight(v);
            });
            */
            $('a.colorbox').colorbox({'photo':true});
            //prettyPrint();
    }
);