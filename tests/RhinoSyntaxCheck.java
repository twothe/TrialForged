import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.ContextFactory;
import java.nio.file.Files;
import java.nio.file.Path;

/** Compiles scripts with the installed KubeJS Rhino parser without running game-dependent handlers. */
public final class RhinoSyntaxCheck {
    public static void main(String[] args) throws Exception {
        Context context = new ContextFactory().enter();
        for (String source : args) {
            context.compileString(Files.readString(Path.of(source)), source, 1, null);
        }
        System.out.println("PASS: " + args.length + " scripts compiled in installed Rhino.");
    }
}
