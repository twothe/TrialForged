import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.ContextFactory;
import dev.latvian.mods.rhino.Scriptable;
import java.nio.file.Files;
import java.nio.file.Path;

/** Executes a script contract suite in the exact Rhino engine bundled with KubeJS. */
public final class RhinoProgressionCheck {
    public static void main(String[] args) throws Exception {
        Context context = new ContextFactory().enter();
        Scriptable scope = context.initStandardObjects();
        for (String source : args) {
            context.evaluateString(scope, Files.readString(Path.of(source)), source, 1, null);
        }
        String entry = System.getProperty("trialforged.test.entry", "runProgressionTests");
        if (!entry.matches("[A-Za-z][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid test entry point");
        }
        Object result = context.evaluateString(scope, entry + "()", "test runner", 1, null);
        System.out.println("PASS: " + result + " production-handler scenarios in installed KubeJS Rhino.");
    }
}
